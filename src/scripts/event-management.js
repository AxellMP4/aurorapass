// Event management module - Supabase integration
import { supabase } from './supabase-client.js';
import { showToast } from './main.js';

/**
 * Create a new event
 * @param {Object} eventData - Event data to create
 * @returns {Promise<Object>} - Created event data
 */
export async function createEvent(eventData) {
    try {
        // Get current user ID from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('events')
            .insert({
                owner_id: user.id,
                ...eventData
            })
            .select()
            .single();

        if (error) throw error;

        // Create default roles for the event
        await createDefaultRoles(data.id, user.id);

        return data;
    } catch (error) {
        throw new Error(`Échec de création d'événement: ${error.message}`);
    }
}

/**
 * Get events for the current user (owned events and events they're a member of)
 * @param {Object} filters - Optional filters (status, date range, etc.)
 * @returns {Promise<Array>} - Array of events
 */
export async function getUserEvents(filters = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        let query = supabase
            .from('events')
            .select(`
                *,
                event_members(id, role_id, joined_at),
                event_roles(id, name, color, emoji),
                event_members!event_members_event_id_fkey(user_id, role_id)
            `);

        // Apply filters if provided
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.startDate) {
            query = query.gte('date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('date', filters.endDate);
        }
        if (filters.search) {
            query = query.ilike('name', `%${filters.search}%`);
        }

        // Order by date descending
        query = query.order('date', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // Filter to only include events where user is owner or member
        const userEvents = data.filter(event =>
            event.owner_id === user.id ||
            event.event_members.some(member => member.user_id === user.id)
        );

        return userEvents;
    } catch (error) {
        throw new Error(`Échec de récupération des événements: ${error.message}`);
    }
}

/**
 * Get a specific event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} - Event data
 */
export async function getEventById(eventId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                event_roles(id, name, color, emoji),
                event_members(
                    id,
                    user_id,
                    role_id,
                    joined_at,
                    invited_by,
                    status,
                    users!event_members_user_id_fkey(id, email, email)
                )
            )
            .eq('id', eventId)
            .single();

        if (error) throw error;

        // Check if user has access to this event
        const hasAccess = data.owner_id === user.id ||
                         data.event_members.some(member => member.user_id === user.id);

        if (!hasAccess) {
            throw new Error('Access denied to this event');
        }

        return data;
    } catch (error) {
        throw new Error(`Échec de récupération de l'événement: ${error.message}`);
    }
}

/**
 * Update an event
 * @param {string} eventId - Event ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated event data
 */
export async function updateEvent(eventId, updates) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First check if user owns the event
        const { data: event, error: fetchError } = await supabase
            .from('events')
            .select('owner_id')
            .eq('id', eventId)
            .single();

        if (fetchError) throw fetchError;

        if (event.owner_id !== user.id) {
            throw new Error('Only the event owner can update this event');
        }

        const { data, error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', eventId)
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        throw new Error(`Échec de mise à jour de l'événement: ${error.message}`);
    }
}

/**
 * Delete an event
 * @param {string} eventId - Event ID
 * @returns {Promise<void>}
 */
export async function deleteEvent(eventId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First check if user owns the event
        const { data: event, error: fetchError } = await supabase
            .from('events')
            .select('owner_id')
            .eq('id', eventId)
            .single();

        if (fetchError) throw fetchError;

        if (event.owner_id !== user.id) {
            throw new Error('Only the event owner can delete this event');
        }

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de suppression de l'événement: ${error.message}`);
    }
}

/**
 * Create default roles for a new event
 * @param {string} eventId - Event ID
 * @param {string} ownerId - Owner user ID
 * @returns {Promise<void>}
 */
export async function createDefaultRoles(eventId, ownerId) {
    try {
        // Get default permissions for event management
        const { data: permissions, error: permError } = await supabase
            .from('permissions')
            .select('id')
            .in('code', [
                'events:read',
                'events:update',
                'guests:create',
                'guests:read',
                'guests:update',
                'qr:generate',
                'qr:scan',
                'analytics:view'
            ]);

        if (permError) throw permError;

        const permissionIds = permissions.map(p => p.id);

        // Create default roles
        const defaultRoles = [
            {
                name: 'Organisateur',
                color: '#ff9500',
                emoji: '👑',
                created_by: ownerId
            },
            {
                name: 'Vigile',
                color: '#ff3b30',
                emoji: '🛡️',
                created_by: ownerId
            },
            {
                name: 'Gestionnaire d\'invités',
                color: '#34c759',
                emoji: '👥',
                created_by: ownerId
            }
        ];

        // Insert roles
        const { data: roles, error: rolesError } = await supabase
            .from('event_roles')
            .insert(defaultRoles.map(role => ({
                ...role,
                event_id: eventId
            })))
            .select();

        if (rolesError) throw rolesError;

        // Assign permissions to roles
        const rolePermissions = roles.flatMap(role =>
            permissionIds.map(permissionId => ({
                role_id: role.id,
                permission_id: permissionId
            }))
        );

        if (rolePermissions.length > 0) {
            const { error: permAssignError } = await supabase
                .from('event_role_permissions')
                .insert(rolePermissions);

            if (permAssignError) throw permAssignError;
        }

        // Assign owner as Organisateur role
        const organizerRole = roles.find(role => role.name === 'Organisateur');
        if (organizerRole) {
            await supabase
                .from('event_members')
                .insert({
                    event_id: eventId,
                    user_id: ownerId,
                    role_id: organizerRole.id,
                    status: 'active'
                });
        }
    } catch (error) {
        console.warn(`Failed to create default roles for event ${eventId}:`, error);
        // Don't throw - event creation succeeded, roles are optional enhancement
    }
}

/**
 * Get roles for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} - Array of roles
 */
export async function getEventRoles(eventId) {
    try {
        const { data, error } = await supabase
            .from('event_roles')
            .select('*')
            .eq('event_id', eventId)
            .order('name');

        if (error) throw error;
        return data;
    } catch (error) {
        throw new Error(`Échec de récupération des rôles de l'événement: ${error.message}`);
    }
}

/**
 * Create a custom role for an event
 * @param {string} eventId - Event ID
 * @param {Object} roleData - Role data (name, color, emoji, permissions)
 * @returns {Promise<Object>} - Created role data
 */
export async function createEventRole(eventId, roleData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user has permission to manage roles for this event
        const hasPermission = await checkEventPermission(eventId, user.id, 'events:manage_roles');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to create roles');
        }

        const { data, error } = await supabase
            .from('event_roles')
            .insert({
                event_id: eventId,
                created_by: user.id,
                ...roleData
            })
            .select()
            .single();

        if (error) throw error;

        // Assign permissions if provided
        if (roleData.permissions && roleData.permissions.length > 0) {
            const rolePermissions = roleData.permissions.map(permissionId => ({
                role_id: data.id,
                permission_id: permissionId
            }));

            const { error: permError } = await supabase
                .from('event_role_permissions')
                .insert(rolePermissions);

            if (permError) throw permError;
        }

        return data;
    } catch (error) {
        throw new Error(`Échec de création de rôle: ${error.message}`);
    }
}

/**
 * Update a role for an event
 * @param {string} roleId - Role ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated role data
 */
export async function updateEventRole(roleId, updates) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get the role to check permissions
        const { data: role, error: fetchError } = await supabase
            .from('event_roles')
            .select('event_id')
            .eq('id', roleId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to manage roles for this event
        const hasPermission = await checkEventPermission(role.event_id, user.id, 'events:manage_roles');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to update roles');
        }

        const { data, error } = await supabase
            .from('event_roles')
            .update(updates)
            .eq('id', roleId)
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        throw new Error(`Échec de mise à jour du rôle: ${error.message}`);
    }
}

/**
 * Delete a role from an event
 * @param {string} roleId - Role ID
 * @returns {Promise<void>}
 */
export async function deleteEventRole(roleId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get the role to check permissions
        const { data: role, error: fetchError } = await supabase
            .from('event_roles')
            .select('event_id')
            .eq('id', roleId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to manage roles for this event
        const hasPermission = await checkEventPermission(role.event_id, user.id, 'events:manage_roles');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to delete roles');
        }

        const { error } = await supabase
            .from('event_roles')
            .delete()
            .eq('id', roleId);

        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de suppression du rôle: ${error.message}`);
    }
}

/**
 * Assign a user to an event with a specific role
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID to assign
 * @param {string} roleId - Role ID to assign (optional, defaults based on permissions)
 * @param {string} invitedBy - User ID who sent the invitation (optional)
 * @returns {Promise<Object>} - Event member data
 */
export async function assignUserToEvent(eventId, userId, roleId = null, invitedBy = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user has permission to manage event members
        const hasPermission = await checkEventPermission(eventId, user.id, 'events:manage_roles');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to assign users to event');
        }

        // If no role specified, determine appropriate role
        let finalRoleId = roleId;
        if (!finalRoleId) {
            // Check if user is the owner
            const { data: event } = await supabase
                .from('events')
                .select('owner_id')
                .eq('id', eventId)
                .single();

            if (event.owner_id === userId) {
                // Get owner role (Organisateur)
                const { data: roles } = await supabase
                    .from('event_roles')
                    .select('id')
                    .eq('event_id', eventId)
                    .eq('name', 'Organisateur')
                    .single();

                finalRoleId = roles?.id;
            } else {
                // Default to Guest Manager or first available role
                const { data: roles } = await supabase
                    .from('event_roles')
                    .select('id')
                    .eq('event_id', eventId)
                    .limit(1)
                    .single();

                finalRoleId = roles?.id;
            }
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
            .from('event_members')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();

        if (existingMember) {
            // Update existing member
            const { data, error } = await supabase
                .from('event_members')
                .update({
                    role_id: finalRoleId,
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingMember.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Create new member
            const { data, error } = await supabase
                .from('event_members')
                .insert({
                    event_id: eventId,
                    user_id: userId,
                    role_id: finalRoleId,
                    invited_by: invitedBy || user.id,
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    } catch (error) {
        throw new Error(`Échec d'attribution d'utilisateur à l'événement: ${error.message}`);
    }
}

/**
 * Remove a user from an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<void>}
 */
export async function removeUserFromEvent(eventId, userId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user has permission to manage event members
        const hasPermission = await checkEventPermission(eventId, user.id, 'events:manage_roles');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to remove users from event');
        }

        // Prevent removing the event owner
        const { data: event } = await supabase
            .from('events')
            .select('owner_id')
            .eq('id', eventId)
            .single();

        if (event.owner_id === userId) {
            throw new Error('Cannot remove the event owner');
        }

        const { error } = await supabase
            .from('event_members')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de suppression d'utilisateur de l'événement: ${error.message}`);
    }
}

/**
 * Check if a user has a specific permission for an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} permissionCode - Permission code to check (e.g., 'events:manage_roles')
 * @returns {Promise<boolean>} - True if user has permission
 */
export async function checkEventPermission(eventId, userId, permissionCode) {
    try {
        // Get user's role in the event
        const { data: member, error: memberError } = await supabase
            .from('event_members')
            .select('role_id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();

        if (memberError && memberError.code !== 'PGRST116') { // PGRST116 means no rows returned
            throw memberError;
        }

        // If no membership found, user has no permissions
        if (!member) {
            return false;
        }

        // Get the role details
        const { data: role, error: roleError } = await supabase
            .from('event_roles')
            .select('id')
            .eq('id', member.role_id)
            .single();

        if (roleError) throw roleError;

        // Check if the role has the required permission
        const { data: hasPermission, error: permError } = await supabase
            .from('event_role_permissions')
            .select('permissions!inner(code)', { count: 'exact' })
            .eq('role_id', role.id)
            .eq('permissions.code', permissionCode);

        if (permError) throw permError;

        return (hasPermission?.count ?? 0) > 0;
    } catch (error) {
        console.error(`Error checking permission ${permissionCode} for user ${userId} on event ${eventId}:`, error);
        return false; // Fail safe - deny permission on error
    }
}

/**
 * Get members of an event with their roles and user info
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} - Array of event members with user and role details
 */
export async function getEventMembers(eventId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user has access to this event
        const hasAccess = await checkEventAccess(eventId, user.id);
        if (!hasAccess) {
            throw new Error('Access denied to this event');
        }

        const { data, error } = await supabase
            .from('event_members')
            .select(`
                *,
                users!event_members_user_id_fkey(id, email, email),
                event_roles!event_members_role_id_fkey(id, name, color, emoji)
            )
            .eq('event_id', eventId)
            .order('joined_at');

        if (error) throw error;
        return data;
    } catch (error) {
        throw new Error(`Échec de récupération des membres de l'événement: ${error.message}`);
    }
}

/**
 * Check if a user has access to an event (as owner or member)
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if user has access
 */
export async function checkEventAccess(eventId, userId) {
    try {
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('owner_id')
            .eq('id', eventId)
            .single();

        if (eventError) throw eventError;

        // Check if user is the owner
        if (event.owner_id === userId) {
            return true;
        }

        // Check if user is a member
        const { data: member, error: memberError } = await supabase
            .from('event_members')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (memberError && memberError.code !== 'PGRST116') {
            throw memberError;
        }

        return !!member;
    } catch (error) {
        console.error(`Error checking event access for user ${userId} on event ${eventId}:`, error);
        return false; // Fail safe - deny access on error
    }
}

// Export all functions
export {
    createEvent,
    getUserEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getEventRoles,
    createEventRole,
    updateEventRole,
    deleteEventRole,
    assignUserToEvent,
    removeUserFromEvent,
    checkEventPermission,
    getEventMembers,
    checkEventAccess
};
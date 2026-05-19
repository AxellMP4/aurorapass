// Guest management module - Supabase integration
import { supabase } from './supabase-client.js';
import { showToast } from './main.js';

/**
 * Create a new guest for an event
 * @param {Object} guestData - Guest data to create
 * @returns {Promise<Object>} - Created guest data
 */
export async function createGuest(guestData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user has permission to create guests for this event
        const hasPermission = await checkGuestPermission(
            guestData.event_id,
            user.id,
            'guests:create'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to create guests');
        }

        const { data, error } = await supabase
            .from('guests')
            .insert({
                created_by: user.id,
                ...guestData
            })
            .select()
            .single();

        if (error) throw error;

        // Log the action for audit
        await logAuditAction(
            user.id,
            guestData.event_id,
            'guest_created',
            { guest_id: data.id, guest_name: `${data.first_name} ${data.last_name}` }
        );

        return data;
    } catch (error) {
        throw new Error(`Échec de création d'invité: ${error.message}`);
    }
}

/**
 * Get guests for an event with optional filtering and pagination
 * @param {string} eventId - Event ID
 * @param {Object} filters - Filter options (status, tags, search, etc.)
 * @param {Object} pagination - Pagination options (page, limit)
 * @returns {Promise<Object>} - Guests data with pagination info
 */
export async function getGuests(eventId, filters = {}, pagination = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user has permission to view guests for this event
        const hasPermission = await checkGuestPermission(
            eventId,
            user.id,
            'guests:read'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to view guests');
        }

        let query = supabase
            .from('guests')
            .select(`
                *,
                guest_social_links(
                    id,
                    platform,
                    identifier,
                    profile_url
                ),
                guest_tags!inner(
                    id,
                    name,
                    color,
                    emoji
                ),
                guest_tag_assignments!inner(tag_id),
                guest_accompanions(
                    id,
                    first_name,
                    last_name,
                    relationship,
                    age,
                    rsvp_status
                )
            )
            .eq('event_id', eventId);

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.search) {
            const searchTerm = `%${filters.search}%`;
            query = query.or(
                `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
            );
        }
        if (filters.tags && filters.tags.length > 0) {
            // Filter by tags - guests must have ALL specified tags
            query = query.in('id', supabase
                .from('guest_tag_assignments')
                .select('guest_id')
                .in('tag_id', filters.tags)
            );
        }
        if (filters.groups && filters.groups.length > 0) {
            // Filter by groups
            query = query.in('id', supabase
                .from('guest_group_memberships')
                .select('guest_id')
                .in('group_id', filters.groups)
            );
        }
        if (filters.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
            query = query.lte('created_at', filters.dateTo);
        }

        // Apply pagination
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 50;
        const offset = (page - 1) * limit;

        query = query.range(offset, offset + limit - 1);

        // Order by name
        query = query.order('last_name', { ascending: false })
                    .then('first_name', { ascending: false });

        const { data, count, error } = await query;

        if (error) throw error;

        return {
            guests: data,
            pagination: {
                page: page,
                limit: limit,
                total: count,
                pages: Math.ceil(count / limit)
            }
        };
    } catch (error) {
        throw new Error(`Échec de récupération des invités: ${error.message}`);
    }
}

/**
 * Get a specific guest by ID
 * @param {string} guestId - Guest ID
 * @returns {Promise<Object>} - Guest data with all relationships
 */
export async function getGuestById(guestId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('guests')
            .select(`
                *,
                event_id,
                guest_social_links(
                    id,
                    platform,
                    identifier,
                    profile_url
                ),
                guest_tags(
                    id,
                    name,
                    color,
                    emoji
                ),
                guest_accompanions(
                    id,
                    first_name,
                    last_name,
                    relationship,
                    age,
                    rsvp_status
                ),
                guest_table_assignments(
                    id,
                    table_number,
                    seat_number,
                    notes
                ),
                guest_status_history(
                    id,
                    previous_status,
                    new_status,
                    changed_at
                ),
                guest_notes(
                    id,
                    content,
                    author_uuid,
                    created_at
                )
            )
            .eq('id', guestId)
            .single();

        if (error) throw error;

        // Check if user has permission to view this guest
        const hasPermission = await checkGuestPermission(
            data.event_id,
            user.id,
            'guests:read'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to view this guest');
        }

        return data;
    } catch (error) {
        throw new Error(`Échec de récupération de l'invité: ${error.message}`);
    }
}

/**
 * Update a guest
 * @param {string} guestId - Guest ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated guest data
 */
export async function updateGuest(guestId, updates) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to update this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:update'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to update this guest');
        }

        const { data, error } = await supabase
            .from('guests')
            .update(updates)
            .eq('id', guestId)
            .select()
            .single();

        if (error) throw error;

        // Log the action for audit
        await logAuditAction(
            user.id,
            guest.event_id,
            'guest_updated',
            { guest_id: guestId, changes: updates }
        );

        return data;
    } catch (error) {
        throw new Error(`Échec de mise à jour de l'invité: ${error.message}`);
    }
}

/**
 * Delete a guest
 * @param {string} guestId - Guest ID
 * @returns {Promise<void>}
 */
export async function deleteGuest(guestId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to delete this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:delete'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to delete this guest');
        }

        const { error } = await supabase
            .from('guests')
            .delete()
            .eq('id', guestId);

        if (error) throw error;

        // Log the action for audit
        await logAuditAction(
            user.id,
            guest.event_id,
            'guest_deleted',
            { guest_id: guestId }
        );
    } catch (error) {
        throw new Error(`Échec de suppression de l'invité: ${error.message}`);
    }
}

/**
 * Update guest status (check-in/check-out, etc.)
 * @param {string} guestId - Guest ID
 * @param {string} newStatus - New status value
 * @param {Object} context - Additional context (scanner info, etc.)
 * @returns {Promise<Object>} - Updated guest data
 */
export async function updateGuestStatus(guestId, newStatus, context = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions and current status
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id, status')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to update guest status
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:update'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to update guest status');
        }

        // Get previous status for history
        const previousStatus = guest.status;

        // Start transaction-like behavior (in real app, you'd use Supabase transactions or Edge Functions)
        const { data: updatedGuest, error: updateError } = await supabase
            .from('guests')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', guestId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Add to status history
        await supabase.from('guest_status_history').insert({
            guest_id: guestId,
            previous_status: previousStatus,
            new_status: newStatus,
            changed_by: user.id,
            notes: context.notes || null
        });

        // Log the action for audit
        await logAuditAction(
            user.id,
            guest.event_id,
            'guest_status_changed',
            {
                guest_id: guestId,
                previous_status: previousStatus,
                new_status: newStatus,
                context: context
            }
        );

        // If status changed to entered or finally_exited, update QR code usage if applicable
        if (newStatus === 'entered' || newStatus === 'finally_exited') {
            await updateQrCodeUsage(guestId, guest.event_id, context);
        }

        return updatedGuest;
    } catch (error) {
        throw new Error(`Échec de mise à jour du statut de l'invité: ${error.message}`);
    }
}

/**
 * Add social media links to a guest
 * @param {string} guestId - Guest ID
 * @param {Array<Object>} socialLinks - Array of social link objects
 * @returns {Promise<Array>} - Created social links
 */
export async function addGuestSocialLinks(guestId, socialLinks) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to update this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:update'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to update social links');
        }

        // Insert social links
        const { data, error } = await supabase
            .from('guest_social_links')
            .insert(
                socialLinks.map(link => ({
                    guest_id: guestId,
                    ...link
                }))
            )
            .select();

        if (error) throw error;

        return data;
    } catch (error) {
        throw new Error(`Échec d'ajout des liens sociaux: ${error.message}`);
    }
}

/**
 * Remove social media links from a guest
 * @param {string} guestId - Guest ID
 * @param {Array<string>} linkIds - Array of social link IDs to remove
 * @returns {Promise<void>}
 */
export async function removeGuestSocialLinks(guestId, linkIds) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to update this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:update'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to remove social links');
        }

        const { error } = await supabase
            .from('guest_social_links')
            .delete()
            .in('id', linkIds);

        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de suppression des liens sociaux: ${error.message}`);
    }
}

/**
 * Assign tags to a guest
 * @param {string} guestId - Guest ID
 * @param {Array<string>} tagIds - Array of tag IDs to assign
 * @returns {Promise<Array>} - Created tag assignments
 */
export async function assignGuestTags(guestId, tagIds) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to manage tags for this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:manage_tags'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to assign tags');
        }

        // Verify that all tags belong to the same event
        const { data: tags, error: tagsError } = await supabase
            .from('guest_tags')
            .select('id')
            .in('id', tagIds);

        if (tagsError) throw tagsError;

        const invalidTags = tagIds.filter(tagId =>
            !tags.some(tag => tag.id === tagId) ||
            tags.find(tag => tag.id === tagId).event_id !== guest.event_id
        );

        if (invalidTags.length > 0) {
            throw new Error('Some tags do not belong to this event');
        }

        // Check for existing assignments to avoid duplicates
        const { data: existingAssignments } = await supabase
            .from('guest_tag_assignments')
            .select('tag_id')
            .eq('guest_id', guestId);

        const existingTagIds = existingAssignments.map(a => a.tag_id);
        const newTagIds = tagIds.filter(tagId => !existingTagIds.includes(tagId));

        if (newTagIds.length === 0) {
            return []; // No new tags to assign
        }

        // Insert new tag assignments
        const { data, error } = await supabase
            .from('guest_tag_assignments')
            .insert(
                newTagIds.map(tagId => ({
                    guest_id: guestId,
                    tag_id: tagId,
                    assigned_by: user.id
                }))
            )
            .select();

        if (error) throw error;

        // Log the action for audit
        await logAuditAction(
            user.id,
            guest.event_id,
            'guest_tags_assigned',
            { guest_id: guestId, tag_ids: newTagIds }
        );

        return data;
    } catch (error) {
        throw new Error(`Échec d'attribution des tags: ${error.message}`);
    }
}

/**
 * Remove tags from a guest
 * @param {string} guestId - Guest ID
 * @param {Array<string>} tagIds - Array of tag IDs to remove
 * @returns {Promise<void>}
 */
export async function removeGuestTags(guestId, tagIds) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to manage tags for this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:manage_tags'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to remove tags');
        }

        const { error } = await supabase
            .from('guest_tag_assignments')
            .delete()
            .eq('guest_id', guestId)
            .in('tag_id', tagIds);

        if (error) throw error;

        // Log the action for audit
        await logAuditAction(
            user.id,
            guest.event_id,
            'guest_tags_removed',
            { guest_id: guestId, tag_ids: tagIds }
        );
    } catch (error) {
        throw new Error(`Échec de suppression des tags: ${error.message}`);
    }
}

/**
 * Assign a guest to a table/seat
 * @param {string} guestId - Guest ID
 * @param {Object} tableData - Table assignment data
 * @returns {Promise<Object>} - Created table assignment
 */
export async function assignGuestToTable(guestId, tableData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to manage tables for this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:manage_tables'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to assign table');
        }

        const { data, error } = await supabase
            .from('guest_table_assignments')
            .insert({
                guest_id: guestId,
                assigned_by: user.id,
                ...tableData
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        throw new Error(`Échec d'affectation à table: ${error.message}`);
    }
}

/**
 * Remove table assignment from a guest
 * @param {string} guestId - Guest ID
 * @param {string} assignmentId - Table assignment ID to remove
 * @returns {Promise<void>}
 */
export async function removeGuestTableAssignment(guestId, assignmentId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to manage tables for this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:manage_tables'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to remove table assignment');
        }

        const { error } = await supabase
            .from('guest_table_assignments')
            .delete()
            .eq('id', assignmentId)
            .eq('guest_id', guestId);

        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de suppression de l'affectation à table: ${error.message}`);
    }
}

/**
 * Add accompaniments to a guest
 * @param {string} guestId - Guest ID
 * @param {Array<Object>} accompaniments - Array of accompaniment objects
 * @returns {Promise<Array>} - Created accompaniments
 */
export async function addGuestAccompaniments(guestId, accompaniments) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to manage accomapanions for this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:manage_accompanions'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to add accompaniments');
        }

        const { data, error } = await supabase
            .from('guest_accompanions')
            .insert(
                accompaniments.map(acc => ({
                    guest_id: guestId,
                    ...acc
                }))
            )
            .select();

        if (error) throw error;

        return data;
    } catch (error) {
        throw new Error(`Échec d'ajout des accompagnants: ${error.message}`);
    }
}

/**
 * Remove accompaniments from a guest
 * @param {string} guestId - Guest ID
 * @param {Array<string>} accompanimentIds - Array of accompaniment IDs to remove
 * @returns {Promise<void>}
 */
export async function removeGuestAccompaniments(guestId, accompanimentIds) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to manage accomapanions for this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:manage_accompanions'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to remove accompaniments');
        }

        const { error } = await supabase
            .from('guest_accompanions')
            .delete()
            .eq('guest_id', guestId)
            .in('id', accompanimentIds);

        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de suppression des accompagnants: ${error.message}`);
    }
}

/**
 * Add internal notes to a guest
 @param {string} guestId - Guest ID
 * @param {Object} noteData - Note data (content, is_private, etc.)
 * @returns {Promise<Object>} - Created note
 */
export async function addGuestNote(guestId, noteData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to add notes for this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:update'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to add notes');
        }

        const { data, error } = await supabase
            .from('guest_notes')
            .insert({
                guest_id: guestId,
                author_uuid: user.id,
                ...noteData
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        throw new Error(`Échec d'ajout de note: ${error.message}`);
    }
}

/**
 * Get guest status history
 * @param {string} guestId - Guest ID
 * @returns {Promise<Array>} - Array of status history entries
 */
export async function getGuestStatusHistory(guestId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First get the guest to check permissions
        const { data: guest, error: fetchError } = await supabase
            .from('guests')
            .select('event_id')
            .eq('id', guestId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to view this guest
        const hasPermission = await checkGuestPermission(
            guest.event_id,
            user.id,
            'guests:read'
        );
        if (!hasPermission) {
            throw new Error('Insufficient permissions to view guest status history');
        }

        const { data, error } = await supabase
            .from('guest_status_history')
            .select('*')
            .eq('guest_id', guestId)
            .order('changed_at', { ascending: false });

        if (error) throw error;

        return data;
    } catch (error) {
        throw new Error(`Échec de récupération de l'historique de statut: ${error.message}`);
    }
}

/**
 * Check if a user has a specific guest-related permission for an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} permissionCode - Permission code to check
 * @returns {Promise<boolean>} - True if user has permission
 */
export async function checkGuestPermission(eventId, userId, permissionCode) {
    try {
        // First check if user has access to the event
        const hasEventAccess = await checkEventAccess(eventId, userId);
        if (!hasEventAccess) {
            return false;
        }

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

        // If no membership found, user has no permissions (except maybe public read?)
        if (!member) {
            // For now, require membership for all guest permissions
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
        console.error(`Error checking guest permission ${permissionCode} for user ${userId} on event ${eventId}:`, error);
        return false; // Fail safe - deny permission on error
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

/**
 * Update QR code usage when guest status changes
 * @param {string} guestId - Guest ID
 * @param {string} eventId - Event ID
 * @param {Object} context - Context of the status change (scanner info, etc.)
 * @returns {Promise<void>}
 */
export async function updateQrCodeUsage(guestId, eventId, context = {}) {
    try {
        // Find active QR codes for this guest and event
        const { data: qrCodes, error: qrError } = await supabase
            .from('qr_codes')
            .select('*')
            .eq('guest_id', guestId)
            .eq('event_id', eventId)
            .eq('is_revoked', false)
            .gt('usage_limit', 0) // Only those with usage limits
            .lte('usage_count', supabase.raw('usage_limit - 1')) // Not yet at limit
            .lt('expires_at', new Date().toISOString()) // Not expired
            .gte('expires_at', new Date().toISOString()) // This condition makes no sense - fixing
            .order('issued_at', { ascending: false }); // Get most recent first

        // Fix the date logic - we want QR codes that are NOT expired
        // So expires_at should be greater than NOW
        const { data: validQrCodes, error: validQrError } = await supabase
            .from('qr_codes')
            .select('*')
            .eq('guest_id', guestId)
            .eq('event_id', eventId)
            .eq('is_revoked', false)
            .gt('usage_limit', 0)
            .lte('usage_count', supabase.raw('usage_limit - 1'))
            .gt('expires_at', new Date().toISOString()) // Not expired (future date)
            .order('issued_at', { ascending: false });

        if (validQrError) throw validQrError;

        // Increment usage count for the most recent valid QR code
        if (validQrCodes.length > 0) {
            const qrCode = validQrCodes[0];
            const newUsageCount = qrCode.usage_count + 1;

            const { data, error } = await supabase
                .from('qr_codes')
                .update({
                    usage_count: newUsageCount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', qrCode.id)
                .select()
                .single();

            if (error) throw error;

            // If we've reached the limit, we could optionally revoke the QR code
            // But typically we'd leave it valid until explicitly revoked or expired
            if (newUsageCount >= qrCode.usage_limit) {
                // Optional: auto-revoke when limit reached
                // await supabase
                //     .from('qr_codes')
                //     .update({ is_revoked: true, revoked_at: new Date().toISOString() })
                //     .eq('id', qrCode.id);
            }
        }
    } catch (error) {
        console.warn(`Failed to update QR code usage for guest ${guestId}:`, error);
        // Don't throw - status update succeeded, QR tracking is secondary
    }
}

/**
 * Log an audit action
 * @param {string} userId - User ID who performed the action
 * @param {string} eventId - Event ID related to the action
 * @param {string} actionType - Type of action performed
 * @param {Object} details - Additional details about the action
 * @returns {Promise<void>}
 */
export async function logAuditAction(userId, eventId, actionType, details = {}) {
    try {
        await supabase.from('audit_log').insert({
            user_id: userId,
            event_id: eventId,
            action_type: actionType,
            action_details: details,
            ip_address: null, // Could be extracted from request in real implementation
            user_agent: null  // Could be extracted from request in real implementation
        });
    } catch (error) {
        console.warn(`Failed to log audit action:`, error);
        // Don't throw - main operation succeeded, logging is secondary
    }
}

// Export all functions
export {
    createGuest,
    getGuests,
    getGuestById,
    updateGuest,
    deleteGuest,
    updateGuestStatus,
    addGuestSocialLinks,
    removeGuestSocialLinks,
    assignGuestTags,
    removeGuestTags,
    assignGuestToTable,
    removeGuestTableAssignment,
    addGuestAccompaniments,
    removeGuestAccompaniments,
    addGuestNote,
    getGuestStatusHistory,
    checkGuestPermission,
    checkEventAccess
};
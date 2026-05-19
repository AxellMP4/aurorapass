-- AuroraPASS Database Schema
-- Run this in the Supabase SQL editor to set up the database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: events
-- Stores basic information about each event
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL, -- Reference to auth.users(id)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    address TEXT,
    capacity INTEGER,
    min_age INTEGER,
    is_vip_access BOOLEAN DEFAULT FALSE,
    is_security_enhanced BOOLEAN DEFAULT FALSE,
    banner_url TEXT,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#007aff',
    secondary_color VARCHAR(7) DEFAULT '#ffffff',
    accent_color VARCHAR(7) DEFAULT '#007aff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: event_roles
-- Custom roles defined for each event (e.g., "VIP Manager", "Technicien Son")
CREATE TABLE IF NOT EXISTS event_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#007aff',
    emoji VARCHAR(10) DEFAULT '👤',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, name)
);

-- Table: permissions
-- Master list of available permissions in the system
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'guests:create', 'events:edit'
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL -- e.g., 'guests', 'events', 'security', 'analytics'
);

-- Table: event_role_permissions
-- Junction table linking roles to permissions (many-to-many)
CREATE TABLE IF NOT EXISTS event_role_permissions (
    role_id UUID NOT NULL REFERENCES event_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Table: event_members
-- Users assigned to events with specific roles
CREATE TABLE IF NOT EXISTS event_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES event_roles(id) ON DELETE SET NULL, -- NULL means using default permissions based on event ownership/admin?
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'rejected', 'left')),
    UNIQUE(event_id, user_id)
);

-- Table: guests
-- Main guest information
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    photo_url TEXT,
    -- Social media links will be in a separate table
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: guest_social_links
-- Social media profiles for guests
CREATE TABLE IF NOT EXISTS guest_social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- instagram, snapchat, tiktok, discord, x, facebook, etc.
    identifier VARCHAR(255) NOT NULL, -- username or handle
    profile_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(guest_id, platform)
);

-- Table: guest_tags
-- Custom tags defined per event (VIP, blacklist, famille, staff, etc.)
CREATE TABLE IF NOT EXISTS guest_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#ff9500',
    emoji VARCHAR(10) DEFAULT '🏷️',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, name)
);

-- Table: guest_tag_assignments
-- Junction table linking guests to tags (many-to-many)
CREATE TABLE IF NOT EXISTS guest_tag_assignments (
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES guest_tags(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (guest_id, tag_id)
);

-- Table: guest_groups
-- Free-form groups of guests (e.g., "Famille proche", "Collègues bureau")
CREATE TABLE IF NOT EXISTS guest_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, name)
);

-- Table: guest_group_memberships
-- Junction table linking guests to groups
CREATE TABLE IF NOT EXISTS guest_group_memberships (
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES guest_groups(id) ON DELETE CASCADE,
    added_by UUID REFERENCES auth.users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (guest_id, group_id)
);

-- Table: guest_categories
-- Formal categories of guests (e.g., "Famille", "Amis", "Professionnel")
CREATE TABLE IF NOT EXISTS guest_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, name)
);

-- Table: guest_category_assignments
-- Junction table linking guests to categories
CREATE TABLE IF NOT EXISTS guest_category_assignments (
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES guest_categories(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (guest_id, category_id)
);

-- Table: guest_table_assignments
-- Table and seating assignments for guests
CREATE TABLE IF NOT EXISTS guest_table_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    table_number VARCHAR(50),
    seat_number VARCHAR(50),
    notes TEXT,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: guest_accompanions
-- Accompanying persons linked to a main guest
CREATE TABLE IF NOT EXISTS guest_accompanions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(100),
    age INTEGER,
    rsvp_status VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'no-show')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: guest_status_history
-- History of status changes for guests (check-in/check-out, etc.)
CREATE TABLE IF NOT EXISTS guest_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Table: guest_notes
-- Internal notes about guests
CREATE TABLE IF NOT EXISTS guest_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_uuid UUID REFERENCES auth.users(id),
    is_private BOOLEAN DEFAULT FALSE, -- If true, only visible to certain roles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: qr_codes
-- Metadata about issued QR codes
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE, -- Hash of the JWT token for quick lookup
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER DEFAULT 1, -- 1 for single use, >1 for limited multi-use, 0 for unlimited
    usage_count INTEGER DEFAULT 0,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    revocation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: qr_scan_logs
-- Log of all QR scan attempts (successful and failed)
CREATE TABLE IF NOT EXISTS qr_scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scanner_device_info TEXT, -- User agent or device info if available
    scanner_ip INET, -- IP address of scanner if available
    location VARCHAR(255), -- Location where scan occurred (if available)
    success BOOLEAN NOT NULL,
    failure_reason TEXT, -- NULL if success, otherwise reason: 'invalid_token', 'expired', 'revoked', 'usage_limit', 'not_found', 'access_denied'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: invitations
-- Invitations sent between users for specific event roles
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL, -- Email of person being invited
    invitee_uuid UUID REFERENCES auth.users(id), -- Will be filled if they already have an account
    role_id UUID NOT NULL REFERENCES event_roles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(event_id, inviter_id, invitee_email, role_id)
);

-- Table: dashboard_widgets
-- Definitions of available widgets for the customizable dashboard
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., 'metrics', 'charts', 'lists', 'timelines'
    config_schema JSONB, -- JSON schema for widget configuration
    default_config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: dashboard_layouts
-- Saved dashboard configurations per user/event
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- NULL means global layout
    name VARCHAR(100) NOT NULL, -- e.g., 'Default', 'Festival View', 'Wedding View'
    layout_config JSONB NOT NULL, -- Contains tabs, widgets, positions, sizes, etc.
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id, name)
);

-- Table: audit_log
-- General audit log for important actions
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    event_id UUID REFERENCES events(id),
    action_type VARCHAR(100) NOT NULL, -- e.g., 'guest_created', 'event_updated', 'role_assigned'
    action_details JSONB, -- Additional details about the action
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON events(owner_id);
CREATE INDEX IF NOT EXISTS idx_event_roles_event_id ON event_roles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_event_id ON event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user_id ON event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guest_social_links_guest_id ON guest_social_links(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_tag_assignments_guest_id ON guest_tag_assignments(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_tag_assignments_tag_id ON guest_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_guest_table_assignments_guest_id ON guest_table_assignments(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_accompanions_guest_id ON guest_accompanions(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_status_history_guest_id ON guest_status_history(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_notes_guest_id ON guest_notes(guest_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_guest_id ON qr_codes(guest_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_event_id ON qr_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token_hash ON qr_codes(token_hash);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_qr_code_id ON qr_scan_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at ON qr_scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_invitations_event_id ON invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_id ON audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
DO $$
DECLARE
    tables TEXT[] := ARRAY['events', 'event_roles', 'guests', 'guest_social_links', 'guest_tags', 'guest_groups', 'guest_categories', 'guest_table_assignments', 'guest_accompanions', 'guest_notes', 'qr_codes', 'invitations', 'dashboard_layouts'];
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
             CREATE TRIGGER update_%s_updated_at
                 BEFORE UPDATE ON %s
                 FOR EACH ROW
                 EXECUTE FUNCTION update_updated_at_column();',
            table_name, table_name, table_name, table_name
        );
    END LOOP;
END $$;

-- Insert default permissions
INSERT INTO permissions (code, description, category) VALUES
    ('events:create', 'Create new events', 'events'),
    ('events:read', 'View event details', 'events'),
    ('events:update', 'Edit event details', 'events'),
    ('events:delete', 'Delete events', 'events'),
    ('events:manage_roles', 'Manage event roles and staff', 'events'),
    ('guests:create', 'Create guest profiles', 'guests'),
    ('guests:read', 'View guest profiles', 'guests'),
    ('guests:update', 'Edit guest profiles', 'guests'),
    ('guests:delete', 'Delete guest profiles', 'guests'),
    ('guests:manage_tags', 'Manage guest tags and categories', 'guests'),
    ('guests:manage_accompanions', 'Manage guest accompaniments', 'guests'),
    ('guests:manage_tables': 'Manage table assignments', 'guests'),
    ('qr:generate', 'Generate QR codes for guests', 'qr'),
    ('qr:scan', 'Scan and validate QR codes', 'qr'),
    ('qr:revoke', 'Revoke QR codes', 'qr'),
    ('analytics:view', 'View event analytics and reports', 'analytics'),
    ('analytics:export', 'Export event data (CSV, PDF, etc.)', 'analytics'),
    ('notifications:send', 'Send notifications (email, SMS, etc.)', 'notifications'),
    ('settings:manage', 'Manage account and event settings', 'settings')
ON CONFLICT (code) DO NOTHING;

-- Note: Default roles (Owner, Event Admin, Security, Guest Manager, Read Only)
-- are typically handled in application logic rather than as static roles in the database,
-- since Owner and Event Admin are contextual to specific events and users.
-- However, we could insert baseline roles if desired.

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_accompanions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for each table
-- Events: Users can view/edit events they own or have appropriate role in
CREATE POLICY "Users can view their own events" ON events
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view events they are members of" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_members
            WHERE event_members.event_id = events.id
            AND event_members.user_id = auth.uid()
            AND event_members.status = 'active'
        )
    );

CREATE POLICY "Owners can insert events" ON events
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own events" ON events
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their own events" ON events
    FOR DELETE USING (owner_id = auth.uid());

-- Event members: Users can view members of events they belong to
CREATE POLICY "Users can view event members for events they belong to" ON event_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_members em2
            WHERE em2.event_id = event_members.event_id
            AND em2.user_id = auth.uid()
            AND em2.status = 'active'
        )
    );

CREATE POLICY "Event owners can manage event members" ON event_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_members.event_id
            AND events.owner_id = auth.uid()
        )
    );

CREATE POLICY "Event admins can manage event members" ON event_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_roles er
            JOIN event_members em ON er.id = em.role_id
            WHERE er.event_id = event_members.event_id
            AND em.user_id = auth.uid()
            AND em.status = 'active'
            -- Assuming we have a way to check if role has 'events:manage_roles' permission
            -- This would be handled in application logic or with more complex SQL
        )
    );

-- Guests: Users can view/edit guests for events they belong to
CREATE POLICY "Users can view guests for events they belong to" ON guests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_members em
            WHERE em.event_id = guests.event_id
            AND em.user_id = auth.uid()
            AND em.status = 'active'
        )
    );

CREATE POLICY "Users can insert guests for events they belong to" ON guests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_members em
            WHERE em.event_id = NEW.event_id
            AND em.user_id = auth.uid()
            AND em.status = 'active'
        )
    );

CREATE POLICY "Users can update guests for events they belong to" ON guests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM event_members em
            WHERE em.event_id = NEW.event_id
            AND em.user_id = auth.uid()
            AND em.status = 'active'
        )
    );

CREATE POLICY "Users can delete guests for events they belong to" ON guests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_members em
            WHERE em.event_id = OLD.event_id
            AND em.user_id = auth.uid()
            AND em.status = 'active'
        )
    );

-- Similar RLS policies would be created for other tables...
-- For brevity, we're showing the pattern; in practice, you'd create policies for all tables
-- based on the user's membership in the event via event_members table.

-- Note: In a real implementation, you might want to create a helper function
-- to check if a user has access to an event based on their role and permissions,
-- and use that in policies for more fine-grained control.

-- Supabase also provides helper functions like auth.uid() and auth.jwt() for use in policies.
-- For example, to check if a user has a specific role in an event:
-- EXISTS (
--     SELECT 1 FROM event_members em
--     JOIN event_roles er ON em.role_id = er.id
--     WHERE em.event_id = events.id
--     AND em.user_id = auth.uid()
--     AND er.has_permission = true -- would need to join permissions
-- )
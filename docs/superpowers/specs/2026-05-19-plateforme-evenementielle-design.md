# Spécification de conception : Plateforme d'accès événementielle

**Date** : 2026-05-19  
**Auteur** : Claude Code (assisté par l'utilisateur)  
**Version** : 1.0  

## 1. Vision du produit

Construire une plateforme web SaaS moderne, professionnelle et sécurisée pour la gestion d'accès événementielle avec QR codes cryptographiquement sécurisés, destinée à tout type d'organisateur (particulier ou professionnel) pour des événements variés : anniversaires, soirées privées, galas, festivals, mariages, événements BDE, networking, conférences, concerts privés, expériences VIP, etc.

L'objectif est de fournir un produit premium, évolutif et commercialisable, avec une expérience utilisateur de qualité Apple, tout en restant entièrement déployable et utilisable gratuitement dans la plupart des cas d'usage grâce aux niveaux gratuits généreux de Supabase et Netlify.

## 2. Architecture technique

### 2.1 Principes directeurs
- **Simplicité** : Architecture monolithique légère pour un développeur solo, facile à comprendre, maintenir et déboguer.
- **Services gérés** : Exploiter au maximum les services gérés (Supabase, Netlify) pour réduire la complexité opérationnelle.
- **Performances** : Prioriser la rapidité d'exécution et la fluidité sur tous les appareils.
- **Sécurité** : Sécurité par défaut avec authentification robuste, RLS Supabase stricte et QR codes cryptographiquement signés.
- **Gratuité** : Conçu pour rester dans les niveaux gratuits de Supabase et Netlify pour un usage typique d'organisateur d'événement.

### 2.2 Stack technologique

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Frontend** | HTML5 sémantique, CSS moderne (Grid/Flexbox, variables CSS), JavaScript vanilla ES6+ | Pas de framework pour éviter la surcharge, tout reste compréhensible et débogable facilement. Animations légères via CSS/JS pur. |
| **Style/UI** | Polices système `-apple-system`, palette personnalisable, animations inspirées de uiball.com/ldrs et reactbits.dev | Esthétique Apple-grade, prémium, fluide, avec feedback visuel satisfaisant. |
| **Hébergement frontend** | Netlify (plan gratuit) | CDN global, déploiement continu depuis Git, gratuit pour sites statiques (100 Go bande passante/mois, 300 min build/mois). |
| **Backend/Auth** | Supabase Auth (Email/Password obligatoire + vérif email, OAuth Google/Apple/Discord optionnels, OTP SMS, 2FA TOTP) | Authentification complète et sécurisée, gérée, avec gestion des sessions et protection force brute. |
| **Base de données** | Supabase PostgreSQL (niveau gratuit : 500 Mo) | Stockage relationnel principal avec Row Level Security (RLS) granulaire pour isolation des événements et contrôle des accès. |
| **Stockage fichiers** | Supabase Storage (niveau gratuit : 1 Go) | Photos de profil, logos d'événements, images de billets, exports PDF/CSV. Optimisation via compression côté client. |
| **Fonctions serverless** | Supabase Edge Functions (niveau gratuit : 1 Go stockage, 500K appels/mois) | Logique métier personnalisée complexe si nécessaire (webhooks, traitement asynchrones, génération dynamique de QR/PKPass). |
| **Réaltime** | Supabase Realtime | Mises à jour en temps réel pour les données critiques (statut invités, check-ins, alertes sécurité) sans polling excessif. |
| **DNS/HTTPS** | Netlify (inclus gratuit) | Domaine personnalisé, certificat SSL automatique, renouvèlement. |

### 2.3 Modèle de données simplifié (tables clés)

- `events` : Informations de base de chaque événement (nom, date, lieu, description, paramètres, branding, règles d'accès)
- `event_roles` : Rôles définis pour un événement (nom, couleur, emoji, créateur)
- `event_role_permissions` : Junction liant rôles et permissions définies
- `permissions` : Catalogue des permissions système (ex: `guests:create`, `events:edit`, `qr:scan`, `analytics:view`)
- `event_members` : Affectation utilisateurs à événements avec rôle spécifique (`user_id`, `event_id`, `role_id`, dates)
- `guests` : Fiches invités (prénom, nom, téléphone, email, photo_url, event_id, créateur, timestamps)
- `guest_social_links` : Liens vers réseaux sociaux (plateforme, identifiant)
- `guest_tags` : Tags personnalisables par événement (nom, couleur, emoji)
- `guest_tag_assignments` : Junction invités ↔ tags
- `guest_groups` / `guest_categories` : Groupes et catégories libres d'invités
- `guest_table_assignments` : Numéro de table, position, notes
- `guest_accompanions` : Liste des accompagnants liés à un invité principal (prénom, nom, relation, statut RSVP)
- `guest_history_log` : Historique complet des actions (type, ancienne/nouvelle valeur, utilisateur responsable, timestamp)
- `guest_status` : Statut de présence actuel (enum : not_yet_arrived, waiting, entered, temporarily_exited, finally_exited, refused, blacklisted, no-show, personnalisé)
- `qr_codes` : Métadonnées des QR émis (token_hash, guest_id, event_id, date_émission, expiration, usage_count, statut)
- `invitations` : Invitations en attention entre utilisateurs pour des rôles spécifiques
- `user_prefs` : Préférences utilisateur (thème par défaut, notifications, etc.)
- `dashboard_configs` : Configurations personnalisées du tableau de bord par utilisateur/événement

Toutes les tables bénéficient de **Row Level Security (RLS)** stricte : un utilisateur ne peut lire/modifier que les données des événements où il possède un rôle valide via `event_members`.

### 2.4 Flows principaux

**Inscription utilisateur**
1. Visite du site → formulaire d'inscription (email, mot de passe)
2. Envoi email de vérification (obligatoire)
3. Connexion → création profil de base dans `profiles` (via trigger Supabase Auth)
4. Redirection vers tableau de bord personnel

**Création d'événement (Owner)**
1. Bouton "Nouvel événement" → formulaire (nom, date, lieu, description, image bannière, couleurs, règles d'accès)
2. Sauvegarde dans `events`
3. Création automatique du rôle "Owner" pour cet événement dans `event_members`

**Gestion des rôles et invitations**
1. Depuis l'événement → onglet "Staff & Rôles"
2. Créer rôles personnalisés (nom, couleur, emoji, sélection de permissions)
3. Envoyer invitation : rechercher utilisateur par email/nom → sélectionner rôle → envoyer
4. L'utilisateur invité reçoit notification → peut accepter/refuser/proposer contre-rôle
5. Une fois accepté → ligne ajoutée dans `event_members`

**Gestion des invités**
1. Création manuelle ou import CSV (mappage flexible des colonnes)
2. Chaque invité possède : identité, contacts, photo, réseaux sociaux, notes, tags, groupes/catégories
3. Attribution possible de : statut de présence, niveaux d'accès/zones, accompagnants, placement/table
4. Toutes les modifications horodatées dans `guest_history_log`

**Génération et validation QR code**
1. Lors de la finalisation d'un invité ou sur demande :
   - Backend génère JWT signé : `{guest_id, event_id, iat, exp, nonce, access_levels, status, permissions}`
   - Token signé encodé en QR code (niveau correction d'erreur Q pour robustesse)
   - Métadonnées sauvegardées dans `qr_codes` (hash token, dates, compteur usage)
2. Mode Vigile (interface minimaliste) :
   - Scan CAMERA → décodage → extraction token
   - Vérification signature (clé publique stockée serveur)
   - Vérification claims (exp, iat, structure)
   - Consultation liste de révocation + métadonnées `qr_codes` (expiration, usage limits)
   - Validation statut invité et niveaux d'accès autorisés pour cet événement
   - Mise à jour usage compteur + timestamp + dispositif (si disponible)
   - Retour immédiat : écran vert (autorisé) avec nom/photo/statu s ou écran rouge (refusé) avec motif
   - Feedback sonore optionnel + mode nuit contraste élevé

**Tableau de bord personnalisable**
1. Utilisateur accède à son événement → voir onglets configurés
2. Chaque onglet contient des widgets glissés-déposés depuis une bibliothèque
3. Widgets exemples :
   - Compteur : "Présents : 124/200" (requête `SELECT count(*) FROM guests WHERE event_id = $1 AND status = 'entered'`)
   - Graphique ligne : évolution du nombre de présents uniques dans le temps
   - Liste : invités récents avec statut coloré et photo
   - Timeline : événements de sécurité en temps réel (arrivées, refus, sorties)
   - Donut : répartition par statut actuel
4. Chaque widget définit :
   - Intervalles de rafraîchissement (temps réel via Realtime, polling intelligent, ou manuel)
   - Filtres applicables (par statut, tag, groupe, niveau d'accès)
   - Taille et ordonnancement dans la grille
5. Configuration sauvegardée dans `dashboard_configs` pour réutilisation


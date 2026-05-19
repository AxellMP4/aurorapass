# AuroraPASS - Plateforme d'accès événementiel

Plateforme web SaaS professionnelle de gestion d'accès événementiel avec QR codes sécurisés, conçue pour être entièrement déployable et utilisable gratuitement grâce à Netlify et Supabase.

## 🎯 Objectif

Fournir une solution complète pour la gestion des accès à tout type d'événement (anniversaire, mariage, festival, conférence, soirée privée, etc.) avec :
- Authentification robuste (email/pass, OAuth, 2FA)
- QR codes cryptographiquement sécurisés et anti-fraude
- Gestion avancée des invités avec métadonnées riches
- Tableau de bord administrateur personnalisable avec visualisations en temps réel
- Interface inspirée d'Apple avec animations satisfaisantes
- Déploiement gratuit sur Netlify + backend gratuit via Supabase

## 🏗️ Architecture

- **Frontend** : HTML5/CSS3/JS vanilla (pas de framework pour rester léger et compréhensible)
- **Hébergement** : Netlify (plan gratuit : 100 Go bande passante/mois, 300 min build/mois)
- **Backend** : Supabase (niveau gratuit généreux)
  - Auth : Authentification complète
  - PostgreSQL : Base de données avec RSL stricte
  - Storage : Stockage de fichiers (photos, logos, etc.)
  - Edge Functions : Logique métier personnalisée
  - Realtime : Mises à jour en temps réel
- **Design** : Style Apple avec polices système, animations satisfaisantes (inspirées de uiball.com/ldrs et reactbits.dev)

## 📁 Structure du projet

```
AuroraPASS/
├── index.html              # Point d'entrée principal
├── netlify.toml           # Configuration Netlify
├── public/                # Fichiers statiques
├── src/
│   ├── components/        # Composants réutilisables
│   ├── styles/
│   │   └── main.css       # Styles principaux avec variables CSS
│   ├── scripts/
│   │   ├── main.js        # Point d'entrée de l'application
│   │   ├── auth.js        # Gestion de l'authentification Supabase
│   │   ├── supabase-client.js # Configuration du client Supabase
│   │   ├── event-management.js # Gestion des événements
│   │   ├── guest-management.js # Gestion des invités
│   │   ├── qr-scanner.js  # Scan et validation QR codes
│   │   ├── dashboard.js   # Tableau de bord personnalisable
│   │   └── ui.js          # Utilitaires UI (thème, toast, etc.)
│   └── assets/
│       ├── images/        # Images statiques
│       └── icons/         # Icônes SVG
├── docs/                  # Documentation
│   ├── superpowers/
│   │   ├── specs/         # Spécifications fonctionnelles
│   │   └── plans/         # Plans d'implémentation
└── README.md
```

## 🚀 Déploiement

### Prérequis
1. Compte [Netlify](https://app.netlify.com/signup) gratuit
2. Compte [Supabase](https://supabase.com/signup) gratuit
3. Git installé localement

### Étapes de déploiement
1. Fork ou clonez ce dépôt
2. Connectez votre dépôt à Netlify (déploiement automatique depuis la branche principale)
3. Dans les paramètres du site Netlify :
   - Build command : `echo "No build step required"`
   - Publish directory : `public`
4. Créez un nouveau projet Supabase
4. Ajoutez les variables d'environnement dans Netlify :
   - `SUPABASE_URL` : Votre URL de projet Supabase
   - `SUPABASE_ANON_KEY` : Votre clé anon Supabase
5. Netlify redéploiera automatiquement avec les nouvelle variables

### Configuration Supabase initiale
Après création du projet Supabase, exécutez les migrations de base pour créer les tables nécessaires (voir docs/superpowers/specs/ pour le schéma complet).

## 💰 Coûts

Pour la plupart des utilisateurs (organisateurs d'événements occasionnels ou réguliers) :
- **Netlify** : Gratuit pour les sites statiques (limites très élevées)
- **Supabase** : Niveau gratuit suffisant pour des centaines d'événements avec milliers d'invités
- **Coût réel** : $0 dans la plupart des cas d'usage

En cas d'usage extrêmement intense (dizaines de milliers d'invités simultanés) :
- Supabase Pro : ~$25/mois
- Toujours très abordable pour un vrai SaaS

## 📄 Licence

Ce projet est fourni à titre éducatif et de démonstration. Voir le fichier LICENSE pour plus de détails.

## 🙏 Remerciements

- [Supabase](https://supabase.com) pour leur plateforme backend généreuse
- [Netlify](https://netlify.com) pour leur hébergement static gratuit
- Communautés open source pour les inspirations de design et d'animation

---
Développé avec ❤️ par Claude Code pour créer une solution événementielle premium accessible à tous.
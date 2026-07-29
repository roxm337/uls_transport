export type Language = 'en' | 'fr';

export const translations = {
    en: {
        sidebar: {
            dashboard: 'Dashboard',
            clients: 'Clients',
            expeditions: 'Expeditions',
            analytics: 'Analytics',
            users: 'Users',
            team: 'Team',
            settings: 'Settings',
            logout: 'Logout',
            backToHome: 'Back to Home',
            notifications: 'Notifications',
            messaging: 'Messaging',
            messagingEmail: 'Email',
            messagingWhatsapp: 'WhatsApp',
            templates: 'Templates',
            language: 'Language',
            requests: 'My Requests',
        },
        header: {
            searchPlaceholder: 'Search leads, analytics...',
            profile: 'Profile',
            settings: 'Settings',
            logout: 'Log out'
        },
        settingsPage: {
            toasts: {
                saveSuccess: 'Settings saved',
                saveError: 'Failed to save settings',
            },
            title: 'Settings',
            subtitle: 'Manage your dashboard configuration and preferences.',
            profile: {
                title: 'Profile Settings',
                description: 'Update your personal information and contact details.',
                fullName: 'Full Name',
                email: 'Email Address',
                save: 'Save Profile'
            },
            notifications: {
                title: 'Notifications',
                description: 'Configure how and when you want to be notified.',
                newLeads: {
                    title: 'New Lead Alerts',
                    description: 'Receive an email notification when a new lead is captured.'
                },
                weeklyReports: {
                    title: 'Weekly Reports',
                    description: 'Get a summary of your dashboard performance every Monday.'
                },
                whatsAppAutoSend: {
                    title: 'WhatsApp Auto Send',
                    description: 'Automatically send a WhatsApp message to new leads when they are captured.'
                },
                save: 'Save Preferences'
            },
            whatsapp: {
                title: 'WhatsApp Configuration',
                description: 'Manage automated WhatsApp messaging for new leads.',
                autoSend: 'Auto-Send Message',
                autoSendDescription: 'Automatically send a message when a new lead is captured.',
                timeout: 'Wait Time (Minutes)',
                timeoutDescription: 'How long to wait (in minutes) before sending the message.',
                message: 'Message Template',
                messageDescription: 'Use {{name}} for the lead\'s name.',
                save: 'Save WhatsApp Settings'
            }
        },
        common: {
            loading: 'Loading...',
            error: 'An error occurred'
        },
        users: {
            title: 'User Management',
            subtitle: 'Manage admin and users accounts.',
            addManager: 'Add User',
            authorizedUsers: 'Authorized Users',
            authorizedUsersSubtitle: 'List of all registered users with access to the dashboard.',
            table: {
                role: 'Role',
                userDetails: 'User Details',
                createdAt: 'Created At',
                actions: 'Actions',
                deleteConfirm: 'Are you sure you want to delete this user?'
            },
            create: {
                title: 'Create New User',
                description: 'Users have access to view leads and dashboard stats.',
                name: 'Name',
                email: 'Email',
                password: 'Password',
                submit: 'Create User',
                submitting: 'Creating...'
            },
            edit: {
                title: 'Edit User',
                description: 'Update user account details.',
                submit: 'Save Changes',
                submitting: 'Saving...',
                passwordPlaceholder: 'Leave empty to keep current password',
                clientMessagingAccessTitle: 'Client messaging access',
                clientMessagingAccessHint: 'Allow this client to access messaging pages.',
                success: 'User updated successfully',
                error: 'Failed to update user'
            },
            loading: 'Loading users...'
        },
        analytics: {
            logs: {
                title: 'Audit Logs',
                subtitle: 'History of actions performed by users.',
                table: {
                    action: 'Action',
                    user: 'User',
                    role: 'Role',
                    details: 'Details',
                    date: 'Date'
                },
                noLogs: 'No logs found.'
            }
        },
        messaging: {
            title: 'Messaging Service',
            subtitle: 'Central hub for all outgoing communications.',
            tabs: {
                compose: 'Compose',
                config: 'Configurations',
                logs: 'Message History'
            },
            compose: {
                title: 'Send a Message',
                channel: 'Channel',
                email: 'Email',
                whatsapp: 'WhatsApp',
                recipient: 'Recipient',
                subject: 'Subject (Email only)',
                message: 'Message Content',
                send: 'Send Now',
                sending: 'Sending...',
                testSuccess: 'Test message sent successfully!',
                testError: 'Failed to send test message.'
            },
            config: {
                title: 'Messaging Configurations',
                subtitle: 'Manage SMTP and WhatsApp settings per scope.',
                clientMessagingEnabled: 'Client messaging access',
                clientMessagingEnabledHint: 'Allow this client to access the messaging pages.',
                add: 'Add Configuration',
                scope: 'Scope',
                client: 'Client',
                landingPage: 'Landing Page',
                smtp: {
                    title: 'SMTP Settings',
                    enabled: 'Enable Email',
                    host: 'SMTP Host',
                    port: 'Port',
                    username: 'Username',
                    password: 'Password',
                    encryption: 'Encryption',
                    fromName: 'From Name',
                    fromEmail: 'From Email'
                },
                whatsapp: {
                    title: 'WhatsApp Settings',
                    enabled: 'Enable WhatsApp',
                    provider: 'Provider',
                    apiKey: 'API Key',
                    apiUrl: 'API URL (Optional)'
                },
                save: 'Save Configuration',
                saving: 'Saving...',
                test: 'Test Configuration',
                delete: 'Delete Configuration',
                deleteConfirm: 'Are you sure you want to delete this configuration?',
                toasts: {
                    saveSuccess: 'Configuration saved successfully',
                    saveError: 'Failed to save configuration',
                    deleteSuccess: 'Configuration deleted successfully',
                    deleteError: 'Failed to delete configuration'
                }
            },
            logs: {
                title: 'Message Logs',
                table: {
                    channel: 'Channel',
                    recipient: 'Recipient',
                    subject: 'Subject',
                    status: 'Status',
                    date: 'Date',
                    actions: 'Actions'
                },
                status: {
                    sent: 'Sent',
                    failed: 'Failed'
                },
                details: 'Log Details',
                noLogs: 'No message logs found.'
            }
        },
    },
    fr: {
        sidebar: {
            dashboard: 'Tableau de bord',
            clients: 'Clients',
            expeditions: 'Expéditions',
            analytics: 'Analytique',
            users: 'Utilisateurs',
            team: 'Équipe',
            settings: 'Paramètres',
            logout: 'Déconnexion',
            backToHome: 'Retour au site',
            notifications: 'Notifications',
            messaging: 'Messagerie',
            messagingEmail: 'Email',
            messagingWhatsapp: 'WhatsApp',
            templates: 'Modèles',
            language: 'Langue',
            requests: 'Mes demandes',
        },
        header: {
            searchPlaceholder: 'Rechercher leads, analytics...',
            profile: 'Profil',
            settings: 'Paramètres',
            logout: 'Se déconnecter'
        },
        settingsPage: {
            toasts: {
                saveSuccess: 'Réglages enregistrés',
                saveError: 'Échec de l’enregistrement des réglages',
            },
            title: 'Paramètres',
            subtitle: 'Gérez la configuration et les préférences de votre tableau de bord.',
            profile: {
                title: 'Paramètres du Profil',
                description: 'Mettez à jour vos informations personnelles et coordonnées.',
                fullName: 'Nom Complet',
                email: 'Adresse Email',
                save: 'Enregistrer le Profil'
            },
            notifications: {
                title: 'Notifications',
                description: 'Configurez comment et quand vous souhaitez être notifié.',
                newLeads: {
                    title: 'Alertes Nouveaux Leads',
                    description: 'Recevez une notification par email lorsqu\'un nouveau lead est capturé.'
                },
                weeklyReports: {
                    title: 'Rapports Hebdomadaires',
                    description: 'Obtenez un résumé des performances de votre tableau de bord chaque lundi.'
                },
                whatsAppAutoSend: {
                    title: 'Envoi Auto WhatsApp',
                    description: 'Envoyer automatiquement un message WhatsApp aux nouveaux leads lors de leur capture.'
                },
                save: 'Enregistrer les Préférences'
            },
            whatsapp: {
                title: 'Configuration WhatsApp',
                description: 'Gérez l\'envoi automatique de messages WhatsApp aux nouveaux leads.',
                autoSend: 'Envoi Automatique',
                autoSendDescription: 'Envoyer automatiquement un message lorsqu\'un nouveau lead est capturé.',
                timeout: 'Délai d\'Attente (Minutes)',
                timeoutDescription: 'Temps d\'attente (en minutes) avant l\'envoi du message.',
                message: 'Modèle de Message',
                messageDescription: 'Utilisez {{name}} pour le nom du lead.',
                save: 'Enregistrer Paramètres WhatsApp'
            }
        },
        common: {
            loading: 'Chargement...',
            error: 'Une erreur est survenue'
        },
        users: {
            title: 'Gestion des Utilisateurs',
            subtitle: 'Gérer les comptes administrateurs et utilisateurs.',
            addManager: 'Ajouter un Utilisateur',
            authorizedUsers: 'Utilisateurs Autorisés',
            authorizedUsersSubtitle: 'Liste de tous les utilisateurs enregistrés ayant accès au tableau de bord.',
            table: {
                role: 'Rôle',
                userDetails: 'Détails de l\'utilisateur',
                createdAt: 'Créé le',
                actions: 'Actions',
                deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?'
            },
            create: {
                title: 'Créer un Nouveau Utilisateur',
                description: 'Les utilisateurs ont accès à la visualisation des leads et des statistiques.',
                name: 'Nom',
                email: 'Email',
                password: 'Mot de passe',
                submit: 'Créer l\'utilisateur',
                submitting: 'Création...'
            },
            edit: {
                title: 'Modifier l\'utilisateur',
                description: 'Mettre à jour les détails du compte utilisateur.',
                submit: 'Enregistrer',
                submitting: 'Enregistrement...',
                passwordPlaceholder: 'Laissez vide pour conserver le mot de passe actuel',
                clientMessagingAccessTitle: 'Accès messagerie client',
                clientMessagingAccessHint: 'Autoriser ce client à accéder aux pages de messagerie.',
                success: 'Utilisateur mis à jour avec succès',
                error: 'Échec de la mise à jour'
            },
            loading: 'Chargement des utilisateurs...'
        },
        analytics: {
            logs: {
                title: 'Traçabilité des Actions',
                subtitle: 'Historique des actions effectuées par les utilisateurs.',
                table: {
                    action: 'Action',
                    user: 'Utilisateur',
                    role: 'Rôle',
                    details: 'Détails',
                    date: 'Date'
                },
                noLogs: "Aucun journal d'activité trouvé."
            }
        },
        messaging: {
            title: 'Service de Messagerie',
            subtitle: 'Centre de contrôle de toutes les communications sortantes.',
            tabs: {
                compose: 'Composer',
                config: 'Configurations',
                logs: 'Historique des messages'
            },
            compose: {
                title: 'Envoyer un Message',
                channel: 'Canal',
                email: 'Email',
                whatsapp: 'WhatsApp',
                recipient: 'Destinataire',
                subject: 'Sujet (Email seulement)',
                message: 'Contenu du message',
                send: 'Envoyer maintenant',
                sending: 'Envoi...',
                testSuccess: 'Message de test envoyé avec succès !',
                testError: 'Échec de l\'envois du message de test.'
            },
            config: {
                title: 'Configurations de Messagerie',
                subtitle: 'Gérez les paramètres SMTP et WhatsApp par portée.',
                clientMessagingEnabled: 'Accès messagerie client',
                clientMessagingEnabledHint: 'Autoriser ce client à accéder aux pages de messagerie.',
                add: 'Ajouter une Configuration',
                scope: 'Portée',
                client: 'Client',
                landingPage: 'Page d\'atterrissage',
                smtp: {
                    title: 'Paramètres SMTP',
                    enabled: 'Activer l\'Email',
                    host: 'Hôte SMTP',
                    port: 'Port',
                    username: 'Nom d\'utilisateur',
                    password: 'Mot de passe',
                    encryption: 'Chiffrement',
                    fromName: 'Nom d\'expédition',
                    fromEmail: 'Email d\'expédition'
                },
                whatsapp: {
                    title: 'Paramètres WhatsApp',
                    enabled: 'Activer WhatsApp',
                    provider: 'Fournisseur',
                    apiKey: 'Clé API',
                    apiUrl: 'URL API (Optionnel)'
                },
                save: 'Enregistrer la Configuration',
                saving: 'Enregistrement...',
                test: 'Tester la Configuration',
                delete: 'Supprimer la Configuration',
                deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cette configuration ?',
                toasts: {
                    saveSuccess: 'Configuration enregistrée avec succès',
                    saveError: 'Échec de l\'enregistrement',
                    deleteSuccess: 'Configuration supprimée avec succès',
                    deleteError: 'Échec de la suppression'
                }
            },
            logs: {
                title: 'Journaux des Messages',
                table: {
                    channel: 'Canal',
                    recipient: 'Destinataire',
                    subject: 'Sujet',
                    status: 'Statut',
                    date: 'Date',
                    actions: 'Actions'
                },
                status: {
                    sent: 'Envoyé',
                    failed: 'Échoué'
                },
                details: 'Détails du Journal',
                noLogs: 'Aucun journal de message trouvé.'
            }
        },
    }
};

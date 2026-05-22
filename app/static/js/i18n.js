/**
 * HexBlock i18n — internationalisation
 *
 * Usage:
 *   t('key')          — translate a key using current locale
 *   t('key', {n: 3})  — translate with variable substitution
 *   setLocale('fr')   — change language (saves to localStorage + API)
 *   getLocale()       — get current locale code
 *
 * Locale is determined in this order:
 *   1. User's saved preference (localStorage hb_locale)
 *   2. Browser Accept-Language
 *   3. English fallback
 */

'use strict';

const SUPPORTED = ['en','fr','de','es','it','pt','nl','pl','ja','zh'];

// ── Translation strings ───────────────────────────────────────

const TRANSLATIONS = {

  en: {
    // Nav
    nav_dashboard:    'Dashboard',
    nav_blocklists:   'Blocklists',
    nav_rules:        'Custom Rules',
    nav_devices:      'Devices',
    nav_vpn:          'VPN / WireGuard',
    nav_query_log:    'Query Log',
    nav_security:     'Security',
    nav_settings:     'Settings',
    nav_logout:       'Sign out',

    // Dashboard page
    dash_title:       'Dashboard',
    dash_queries:     'Queries today',
    dash_blocked:     'Blocked today',
    dash_block_rate:  'Block rate',
    dash_active_lists:'Active lists',
    dash_domains:     'Domains blocked',
    dash_devices:     'Devices',
    dash_vpn_status:  'VPN status',
    dash_uptime:      'Uptime',
    dash_recent_log:  'Recent queries',
    dash_audit:       'Audit log',

    // Blocklists
    bl_title:         'Blocklists',
    bl_add:           'Add blocklist',
    bl_sync:          'Sync all',
    bl_name:          'Name',
    bl_source:        'Source',
    bl_domains:       'Domains',
    bl_updated:       'Last updated',
    bl_enabled:       'Enabled',
    bl_empty:         'No blocklists added yet',
    bl_enter_name:    'Enter a list name',
    bl_preset_loaded: 'Preset loaded — click Add Blocklist',
    bl_enabled_msg:   'Blocklist enabled',
    bl_disabled_msg:  'Blocklist disabled',
    bl_removed_msg:   'Blocklist removed',
    bl_synced_msg:    'Blocklists synced',
    bl_syncing:       'Syncing...',
    bl_parsed:        'Parsed',
    bl_domains_suffix:'domains',

    // Custom rules
    rules_title:      'Custom Rules',
    rules_add:        'Add rule',
    rules_domain:     'Domain',
    rules_action:     'Action',
    rules_allow:      'Allow',
    rules_block:      'Block',
    rules_empty:      'No custom rules defined',
    rules_added:      'Rule added',
    rules_removed:    'Rule removed',

    // Devices
    dev_title:        'Devices',
    dev_add:          'Add device',
    dev_name:         'Device name',
    dev_ip:           'IP address',
    dev_last_seen:    'Last seen',
    dev_empty:        'No devices added yet — add one from the VPN page',
    dev_removed:      'Device removed',
    dev_enter_name:   'Enter a device name',

    // VPN
    vpn_title:        'VPN / WireGuard',
    vpn_status:       'VPN status',
    vpn_active:       'Encrypted and active',
    vpn_offline:      'Offline',
    vpn_add_device:   'Add device',
    vpn_qr:           'Show QR code',
    vpn_no_vpn:       'Start VPN from the VPN page',
    vpn_control:      'VPN control via docker compose — see Settings',
    vpn_tunnel:       'Cloudflare Tunnel',
    vpn_off:          'VPN Off',
    vpn_tunnel_down:  'Tunnel not running',

    // Query log
    log_title:        'Query Log',
    log_empty:        'No queries logged yet',
    log_allowed:      'Allowed',
    log_blocked:      'Blocked',
    log_domain:       'Domain',
    log_client:       'Client',
    log_time:         'Time',

    // Security
    sec_title:        'Security',
    sec_change_pw:    'Change password',
    sec_current_pw:   'Current password',
    sec_new_pw:       'New password',
    sec_confirm_pw:   'Confirm new password',
    sec_save_pw:      'Save',
    sec_cancel:       'Cancel',
    sec_2fa:          'Two-factor authentication',
    sec_audit:        'Audit log',
    sec_audit_empty:  'No audit entries yet',
    sec_pw_changed:   'Password changed successfully',
    sec_pw_failed:    'Failed — check your current password',
    sec_pw_mismatch:  'Passwords do not match',
    sec_pw_short:     'Password must be at least 12 characters',
    sec_all_required: 'All fields are required',
    sec_totp_soon:    'TOTP setup — coming in next build',

    // Settings
    set_title:        'Settings',
    set_hostname:     'Hostname',
    set_upstream_dns: 'Upstream DNS',
    set_timezone:     'Timezone',
    set_save:         'Save settings',
    set_saved:        'Settings saved',
    set_language:     'Language',
    set_proxy:        'Reverse proxy',
    set_allowed_hosts:'Allowed hosts',
    set_version:      'Version',

    // Onboarding
    ob_setup:         'First-time setup',
    ob_account:       'Account',
    ob_network:       'Network',
    ob_blocklists:    'Blocklists',
    ob_vpn:           'VPN',
    ob_done:          'Done',
    ob_create_account:'Create your account',
    ob_account_sub:   'This is the only account for your HexBlock installation. Keep these credentials safe — there is no password reset without direct server access.',
    ob_username:      'Username',
    ob_password:      'Password',
    ob_pw_placeholder:'Minimum 12 characters',
    ob_confirm_pw:    'Confirm password',
    ob_confirm_ph:    'Repeat password',
    ob_continue:      'Continue',
    ob_back:          'Back',
    ob_network_title: 'Network setup',
    ob_network_sub:   'Configure how HexBlock connects to the internet.',
    ob_hostname:      'Hostname',
    ob_hostname_hint: 'How devices will reach your HexBlock instance',
    ob_upstream_dns:  'Upstream DNS',
    ob_upstream_hint: 'Queries that pass the blocklist are forwarded here',
    ob_timezone:      'Timezone',
    ob_bl_title:      'Choose blocklists',
    ob_bl_sub:        'Select which categories to block. You can change these at any time from the dashboard.',
    ob_recommended:   'Recommended',
    ob_vpn_title:     'VPN setup',
    ob_vpn_sub:       'HexBlock uses WireGuard to encrypt all traffic from your devices.',
    ob_vpn_auto:      'Auto setup',
    ob_vpn_auto_desc: 'HexBlock generates keys automatically. Best for most users.',
    ob_vpn_manual:    'Manual',
    ob_vpn_manual_desc:'Provide your own WireGuard keys. For advanced users.',
    ob_vpn_dns_only:  'DNS only',
    ob_vpn_dns_desc:  'Block ads via DNS without a VPN tunnel. Traffic is not encrypted.',
    ob_vpn_skip:      'Skip for now',
    ob_vpn_skip_desc: 'Configure VPN later from the dashboard.',
    ob_finish:        'Finish setup',

    // Login
    login_title:      'Sign in',
    login_username:   'Username',
    login_password:   'Password',
    login_submit:     'Sign in',
    login_totp:       'Authenticator code',
    login_locked:     'Too many failed attempts. Please wait 5 minutes before trying again.',
    login_attempts:   '{n} attempt remaining before lockout.',
    login_attempts_p: '{n} attempts remaining before lockout.',

    // Password strength
    pw_too_short:     'Too short',
    pw_weak:          'Weak',
    pw_fair:          'Fair',
    pw_good:          'Good',
    pw_strong:        'Strong',
    pw_very_strong:   'Very strong',
    pw_enter:         'Enter a password',

    // Blocklist categories
    cat_ads:          'Ads',
    cat_trackers:     'Trackers',
    cat_malware:      'Malware',
    cat_social:       'Social Media',
    cat_telemetry:    'Telemetry',
    cat_adult:        'Adult Content',

    // General
    enabled:          'Enabled',
    disabled:         'Disabled',
    active:           'Active',
    save:             'Save',
    cancel:           'Cancel',
    delete:           'Delete',
    edit:             'Edit',
    add:              'Add',
    remove:           'Remove',
    loading:          'Loading...',
    never:            'Never',
    unknown:          'Unknown',
    today:            'today',
    docker_logs_hint: 'Check docker-compose logs for details',
  },

  fr: {
    nav_dashboard:'Tableau de bord',nav_blocklists:'Listes de blocage',nav_rules:'Règles personnalisées',nav_devices:'Appareils',nav_vpn:'VPN / WireGuard',nav_query_log:'Journal de requêtes',nav_security:'Sécurité',nav_settings:'Paramètres',nav_logout:'Déconnexion',
    dash_title:'Tableau de bord',dash_queries:'Requêtes aujourd\'hui',dash_blocked:'Bloqués aujourd\'hui',dash_block_rate:'Taux de blocage',dash_active_lists:'Listes actives',dash_domains:'Domaines bloqués',dash_devices:'Appareils',dash_vpn_status:'Statut VPN',dash_uptime:'Disponibilité',dash_recent_log:'Requêtes récentes',dash_audit:'Journal d\'audit',
    bl_title:'Listes de blocage',bl_add:'Ajouter une liste',bl_sync:'Synchroniser tout',bl_name:'Nom',bl_source:'Source',bl_domains:'Domaines',bl_updated:'Dernière mise à jour',bl_enabled:'Activé',bl_empty:'Aucune liste ajoutée',bl_enter_name:'Nom de la liste',bl_preset_loaded:'Préréglage chargé — cliquez sur Ajouter',bl_enabled_msg:'Liste activée',bl_disabled_msg:'Liste désactivée',bl_removed_msg:'Liste supprimée',bl_synced_msg:'Listes synchronisées',bl_syncing:'Synchronisation...',bl_parsed:'Analysé',bl_domains_suffix:'domaines',
    rules_title:'Règles personnalisées',rules_add:'Ajouter une règle',rules_domain:'Domaine',rules_action:'Action',rules_allow:'Autoriser',rules_block:'Bloquer',rules_empty:'Aucune règle définie',rules_added:'Règle ajoutée',rules_removed:'Règle supprimée',
    dev_title:'Appareils',dev_add:'Ajouter un appareil',dev_name:'Nom de l\'appareil',dev_ip:'Adresse IP',dev_last_seen:'Dernière connexion',dev_empty:'Aucun appareil — ajoutez-en un depuis la page VPN',dev_removed:'Appareil supprimé',dev_enter_name:'Nom de l\'appareil',
    vpn_title:'VPN / WireGuard',vpn_status:'Statut VPN',vpn_active:'Chiffré et actif',vpn_offline:'Hors ligne',vpn_add_device:'Ajouter un appareil',vpn_qr:'Afficher le QR code',vpn_no_vpn:'Démarrez le VPN depuis la page VPN',vpn_control:'Contrôle VPN via docker compose — voir Paramètres',vpn_tunnel:'Tunnel Cloudflare',vpn_off:'VPN désactivé',vpn_tunnel_down:'Tunnel inactif',
    log_title:'Journal de requêtes',log_empty:'Aucune requête enregistrée',log_allowed:'Autorisé',log_blocked:'Bloqué',log_domain:'Domaine',log_client:'Client',log_time:'Heure',
    sec_title:'Sécurité',sec_change_pw:'Changer le mot de passe',sec_current_pw:'Mot de passe actuel',sec_new_pw:'Nouveau mot de passe',sec_confirm_pw:'Confirmer le nouveau mot de passe',sec_save_pw:'Enregistrer',sec_cancel:'Annuler',sec_2fa:'Authentification à deux facteurs',sec_audit:'Journal d\'audit',sec_audit_empty:'Aucune entrée d\'audit',sec_pw_changed:'Mot de passe modifié',sec_pw_failed:'Échec — vérifiez votre mot de passe actuel',sec_pw_mismatch:'Les mots de passe ne correspondent pas',sec_pw_short:'Le mot de passe doit contenir au moins 12 caractères',sec_all_required:'Tous les champs sont requis',sec_totp_soon:'Configuration TOTP bientôt disponible',
    set_title:'Paramètres',set_hostname:'Nom d\'hôte',set_upstream_dns:'DNS en amont',set_timezone:'Fuseau horaire',set_save:'Enregistrer',set_saved:'Paramètres enregistrés',set_language:'Langue',set_proxy:'Proxy inverse',set_allowed_hosts:'Hôtes autorisés',set_version:'Version',
    ob_setup:'Configuration initiale',ob_account:'Compte',ob_network:'Réseau',ob_blocklists:'Listes de blocage',ob_vpn:'VPN',ob_done:'Terminé',ob_create_account:'Créer votre compte',ob_account_sub:'C\'est le seul compte pour votre installation HexBlock. Conservez ces identifiants en lieu sûr.',ob_username:'Nom d\'utilisateur',ob_password:'Mot de passe',ob_pw_placeholder:'12 caractères minimum',ob_confirm_pw:'Confirmer le mot de passe',ob_confirm_ph:'Répétez le mot de passe',ob_continue:'Continuer',ob_back:'Retour',ob_network_title:'Configuration réseau',ob_network_sub:'Configurez la connexion HexBlock à Internet.',ob_hostname:'Nom d\'hôte',ob_hostname_hint:'Comment les appareils accèdent à HexBlock',ob_upstream_dns:'DNS en amont',ob_upstream_hint:'Les requêtes autorisées sont transmises ici',ob_timezone:'Fuseau horaire',ob_bl_title:'Choisir les listes',ob_bl_sub:'Sélectionnez les catégories à bloquer.',ob_recommended:'Recommandé',ob_vpn_title:'Configuration VPN',ob_vpn_sub:'HexBlock utilise WireGuard pour chiffrer le trafic.',ob_vpn_auto:'Configuration automatique',ob_vpn_auto_desc:'HexBlock génère les clés automatiquement.',ob_vpn_manual:'Manuel',ob_vpn_manual_desc:'Fournissez vos propres clés WireGuard.',ob_vpn_dns_only:'DNS uniquement',ob_vpn_dns_desc:'Blocage sans tunnel VPN. Le trafic n\'est pas chiffré.',ob_vpn_skip:'Ignorer pour l\'instant',ob_vpn_skip_desc:'Configurez le VPN plus tard.',ob_finish:'Terminer la configuration',
    login_title:'Connexion',login_username:'Nom d\'utilisateur',login_password:'Mot de passe',login_submit:'Se connecter',login_totp:'Code d\'authentification',login_locked:'Trop de tentatives. Veuillez attendre 5 minutes.',login_attempts:'{n} tentative restante avant verrouillage.',login_attempts_p:'{n} tentatives restantes avant verrouillage.',
    pw_too_short:'Trop court',pw_weak:'Faible',pw_fair:'Moyen',pw_good:'Bien',pw_strong:'Fort',pw_very_strong:'Très fort',pw_enter:'Saisissez un mot de passe',
    cat_ads:'Publicités',cat_trackers:'Traceurs',cat_malware:'Malwares',cat_social:'Réseaux sociaux',cat_telemetry:'Télémétrie',cat_adult:'Contenu adulte',
    enabled:'Activé',disabled:'Désactivé',active:'Actif',save:'Enregistrer',cancel:'Annuler',delete:'Supprimer',edit:'Modifier',add:'Ajouter',remove:'Supprimer',loading:'Chargement...',never:'Jamais',unknown:'Inconnu',today:'aujourd\'hui',docker_logs_hint:'Consultez les logs docker-compose pour les détails',
  },

  de: {
    nav_dashboard:'Dashboard',nav_blocklists:'Blocklisten',nav_rules:'Benutzerdefinierte Regeln',nav_devices:'Geräte',nav_vpn:'VPN / WireGuard',nav_query_log:'Abfrageprotokoll',nav_security:'Sicherheit',nav_settings:'Einstellungen',nav_logout:'Abmelden',
    dash_title:'Dashboard',dash_queries:'Abfragen heute',dash_blocked:'Heute blockiert',dash_block_rate:'Blockierungsrate',dash_active_lists:'Aktive Listen',dash_domains:'Blockierte Domains',dash_devices:'Geräte',dash_vpn_status:'VPN-Status',dash_uptime:'Betriebszeit',dash_recent_log:'Letzte Abfragen',dash_audit:'Auditprotokoll',
    bl_title:'Blocklisten',bl_add:'Liste hinzufügen',bl_sync:'Alle synchronisieren',bl_name:'Name',bl_source:'Quelle',bl_domains:'Domains',bl_updated:'Zuletzt aktualisiert',bl_enabled:'Aktiviert',bl_empty:'Keine Listen hinzugefügt',bl_enter_name:'Listenname eingeben',bl_preset_loaded:'Voreinstellung geladen — Liste hinzufügen klicken',bl_enabled_msg:'Liste aktiviert',bl_disabled_msg:'Liste deaktiviert',bl_removed_msg:'Liste entfernt',bl_synced_msg:'Listen synchronisiert',bl_syncing:'Synchronisierung...',bl_parsed:'Analysiert',bl_domains_suffix:'Domains',
    rules_title:'Benutzerdefinierte Regeln',rules_add:'Regel hinzufügen',rules_domain:'Domain',rules_action:'Aktion',rules_allow:'Zulassen',rules_block:'Blockieren',rules_empty:'Keine Regeln definiert',rules_added:'Regel hinzugefügt',rules_removed:'Regel entfernt',
    dev_title:'Geräte',dev_add:'Gerät hinzufügen',dev_name:'Gerätename',dev_ip:'IP-Adresse',dev_last_seen:'Zuletzt gesehen',dev_empty:'Keine Geräte — fügen Sie eines von der VPN-Seite hinzu',dev_removed:'Gerät entfernt',dev_enter_name:'Gerätename eingeben',
    vpn_title:'VPN / WireGuard',vpn_status:'VPN-Status',vpn_active:'Verschlüsselt und aktiv',vpn_offline:'Offline',vpn_add_device:'Gerät hinzufügen',vpn_qr:'QR-Code anzeigen',vpn_no_vpn:'VPN von der VPN-Seite starten',vpn_control:'VPN-Steuerung über docker compose — siehe Einstellungen',vpn_tunnel:'Cloudflare-Tunnel',vpn_off:'VPN aus',vpn_tunnel_down:'Tunnel nicht aktiv',
    log_title:'Abfrageprotokoll',log_empty:'Keine Abfragen protokolliert',log_allowed:'Erlaubt',log_blocked:'Blockiert',log_domain:'Domain',log_client:'Client',log_time:'Zeit',
    sec_title:'Sicherheit',sec_change_pw:'Passwort ändern',sec_current_pw:'Aktuelles Passwort',sec_new_pw:'Neues Passwort',sec_confirm_pw:'Neues Passwort bestätigen',sec_save_pw:'Speichern',sec_cancel:'Abbrechen',sec_2fa:'Zwei-Faktor-Authentifizierung',sec_audit:'Auditprotokoll',sec_audit_empty:'Keine Auditeinträge',sec_pw_changed:'Passwort geändert',sec_pw_failed:'Fehlgeschlagen — aktuelles Passwort prüfen',sec_pw_mismatch:'Passwörter stimmen nicht überein',sec_pw_short:'Passwort muss mindestens 12 Zeichen haben',sec_all_required:'Alle Felder sind erforderlich',sec_totp_soon:'TOTP-Einrichtung kommt bald',
    set_title:'Einstellungen',set_hostname:'Hostname',set_upstream_dns:'Upstream-DNS',set_timezone:'Zeitzone',set_save:'Einstellungen speichern',set_saved:'Einstellungen gespeichert',set_language:'Sprache',set_proxy:'Reverse Proxy',set_allowed_hosts:'Erlaubte Hosts',set_version:'Version',
    ob_setup:'Ersteinrichtung',ob_account:'Konto',ob_network:'Netzwerk',ob_blocklists:'Blocklisten',ob_vpn:'VPN',ob_done:'Fertig',ob_create_account:'Konto erstellen',ob_account_sub:'Dies ist das einzige Konto für Ihre HexBlock-Installation. Bewahren Sie diese Zugangsdaten sicher auf.',ob_username:'Benutzername',ob_password:'Passwort',ob_pw_placeholder:'Mindestens 12 Zeichen',ob_confirm_pw:'Passwort bestätigen',ob_confirm_ph:'Passwort wiederholen',ob_continue:'Weiter',ob_back:'Zurück',ob_network_title:'Netzwerkeinrichtung',ob_network_sub:'Konfigurieren Sie die HexBlock-Verbindung.',ob_hostname:'Hostname',ob_hostname_hint:'Wie Geräte HexBlock erreichen',ob_upstream_dns:'Upstream-DNS',ob_upstream_hint:'Erlaubte Abfragen werden hierhin weitergeleitet',ob_timezone:'Zeitzone',ob_bl_title:'Blocklisten wählen',ob_bl_sub:'Kategorien zum Blockieren auswählen.',ob_recommended:'Empfohlen',ob_vpn_title:'VPN-Einrichtung',ob_vpn_sub:'HexBlock verwendet WireGuard zur Verschlüsselung.',ob_vpn_auto:'Automatische Einrichtung',ob_vpn_auto_desc:'HexBlock generiert Schlüssel automatisch.',ob_vpn_manual:'Manuell',ob_vpn_manual_desc:'Eigene WireGuard-Schlüssel angeben.',ob_vpn_dns_only:'Nur DNS',ob_vpn_dns_desc:'Werbeblocker ohne VPN-Tunnel. Datenverkehr nicht verschlüsselt.',ob_vpn_skip:'Jetzt überspringen',ob_vpn_skip_desc:'VPN später konfigurieren.',ob_finish:'Einrichtung abschließen',
    login_title:'Anmelden',login_username:'Benutzername',login_password:'Passwort',login_submit:'Anmelden',login_totp:'Authentifizierungscode',login_locked:'Zu viele Versuche. Bitte 5 Minuten warten.',login_attempts:'{n} Versuch verbleibend vor Sperrung.',login_attempts_p:'{n} Versuche verbleibend vor Sperrung.',
    pw_too_short:'Zu kurz',pw_weak:'Schwach',pw_fair:'Mittelmäßig',pw_good:'Gut',pw_strong:'Stark',pw_very_strong:'Sehr stark',pw_enter:'Passwort eingeben',
    cat_ads:'Werbung',cat_trackers:'Tracker',cat_malware:'Malware',cat_social:'Soziale Medien',cat_telemetry:'Telemetrie',cat_adult:'Erwachseneninhalt',
    enabled:'Aktiviert',disabled:'Deaktiviert',active:'Aktiv',save:'Speichern',cancel:'Abbrechen',delete:'Löschen',edit:'Bearbeiten',add:'Hinzufügen',remove:'Entfernen',loading:'Laden...',never:'Nie',unknown:'Unbekannt',today:'heute',docker_logs_hint:'Docker-Compose-Logs auf Details prüfen',
  },

  es: {
    nav_dashboard:'Panel',nav_blocklists:'Listas de bloqueo',nav_rules:'Reglas personalizadas',nav_devices:'Dispositivos',nav_vpn:'VPN / WireGuard',nav_query_log:'Registro de consultas',nav_security:'Seguridad',nav_settings:'Configuración',nav_logout:'Cerrar sesión',
    dash_title:'Panel',dash_queries:'Consultas hoy',dash_blocked:'Bloqueados hoy',dash_block_rate:'Tasa de bloqueo',dash_active_lists:'Listas activas',dash_domains:'Dominios bloqueados',dash_devices:'Dispositivos',dash_vpn_status:'Estado VPN',dash_uptime:'Tiempo activo',dash_recent_log:'Consultas recientes',dash_audit:'Registro de auditoría',
    bl_title:'Listas de bloqueo',bl_add:'Añadir lista',bl_sync:'Sincronizar todo',bl_name:'Nombre',bl_source:'Fuente',bl_domains:'Dominios',bl_updated:'Última actualización',bl_enabled:'Activado',bl_empty:'No hay listas añadidas',bl_enter_name:'Nombre de la lista',bl_preset_loaded:'Preajuste cargado — haz clic en Añadir',bl_enabled_msg:'Lista activada',bl_disabled_msg:'Lista desactivada',bl_removed_msg:'Lista eliminada',bl_synced_msg:'Listas sincronizadas',bl_syncing:'Sincronizando...',bl_parsed:'Analizado',bl_domains_suffix:'dominios',
    rules_title:'Reglas personalizadas',rules_add:'Añadir regla',rules_domain:'Dominio',rules_action:'Acción',rules_allow:'Permitir',rules_block:'Bloquear',rules_empty:'No hay reglas definidas',rules_added:'Regla añadida',rules_removed:'Regla eliminada',
    dev_title:'Dispositivos',dev_add:'Añadir dispositivo',dev_name:'Nombre del dispositivo',dev_ip:'Dirección IP',dev_last_seen:'Última vez visto',dev_empty:'No hay dispositivos — añade uno desde la página VPN',dev_removed:'Dispositivo eliminado',dev_enter_name:'Nombre del dispositivo',
    vpn_title:'VPN / WireGuard',vpn_status:'Estado VPN',vpn_active:'Cifrado y activo',vpn_offline:'Desconectado',vpn_add_device:'Añadir dispositivo',vpn_qr:'Mostrar código QR',vpn_no_vpn:'Inicia VPN desde la página VPN',vpn_control:'Control VPN via docker compose — ver Configuración',vpn_tunnel:'Túnel Cloudflare',vpn_off:'VPN apagado',vpn_tunnel_down:'Túnel inactivo',
    log_title:'Registro de consultas',log_empty:'No hay consultas registradas',log_allowed:'Permitido',log_blocked:'Bloqueado',log_domain:'Dominio',log_client:'Cliente',log_time:'Hora',
    sec_title:'Seguridad',sec_change_pw:'Cambiar contraseña',sec_current_pw:'Contraseña actual',sec_new_pw:'Nueva contraseña',sec_confirm_pw:'Confirmar nueva contraseña',sec_save_pw:'Guardar',sec_cancel:'Cancelar',sec_2fa:'Autenticación de dos factores',sec_audit:'Registro de auditoría',sec_audit_empty:'No hay entradas de auditoría',sec_pw_changed:'Contraseña cambiada',sec_pw_failed:'Error — verifica tu contraseña actual',sec_pw_mismatch:'Las contraseñas no coinciden',sec_pw_short:'La contraseña debe tener al menos 12 caracteres',sec_all_required:'Todos los campos son obligatorios',sec_totp_soon:'Configuración TOTP próximamente',
    set_title:'Configuración',set_hostname:'Nombre de host',set_upstream_dns:'DNS upstream',set_timezone:'Zona horaria',set_save:'Guardar configuración',set_saved:'Configuración guardada',set_language:'Idioma',set_proxy:'Proxy inverso',set_allowed_hosts:'Hosts permitidos',set_version:'Versión',
    ob_setup:'Configuración inicial',ob_account:'Cuenta',ob_network:'Red',ob_blocklists:'Listas de bloqueo',ob_vpn:'VPN',ob_done:'Listo',ob_create_account:'Crear tu cuenta',ob_account_sub:'Esta es la única cuenta de tu instalación HexBlock. Guarda estas credenciales en un lugar seguro.',ob_username:'Usuario',ob_password:'Contraseña',ob_pw_placeholder:'Mínimo 12 caracteres',ob_confirm_pw:'Confirmar contraseña',ob_confirm_ph:'Repite la contraseña',ob_continue:'Continuar',ob_back:'Atrás',ob_network_title:'Configuración de red',ob_network_sub:'Configura cómo HexBlock se conecta a Internet.',ob_hostname:'Nombre de host',ob_hostname_hint:'Cómo los dispositivos acceden a HexBlock',ob_upstream_dns:'DNS upstream',ob_upstream_hint:'Las consultas permitidas se reenvían aquí',ob_timezone:'Zona horaria',ob_bl_title:'Elegir listas de bloqueo',ob_bl_sub:'Selecciona qué categorías bloquear.',ob_recommended:'Recomendado',ob_vpn_title:'Configuración VPN',ob_vpn_sub:'HexBlock usa WireGuard para cifrar el tráfico.',ob_vpn_auto:'Configuración automática',ob_vpn_auto_desc:'HexBlock genera las claves automáticamente.',ob_vpn_manual:'Manual',ob_vpn_manual_desc:'Proporciona tus propias claves WireGuard.',ob_vpn_dns_only:'Solo DNS',ob_vpn_dns_desc:'Bloquear sin túnel VPN. El tráfico no está cifrado.',ob_vpn_skip:'Omitir por ahora',ob_vpn_skip_desc:'Configura VPN más tarde.',ob_finish:'Finalizar configuración',
    login_title:'Iniciar sesión',login_username:'Usuario',login_password:'Contraseña',login_submit:'Entrar',login_totp:'Código de autenticación',login_locked:'Demasiados intentos. Espera 5 minutos.',login_attempts:'{n} intento restante antes del bloqueo.',login_attempts_p:'{n} intentos restantes antes del bloqueo.',
    pw_too_short:'Muy corta',pw_weak:'Débil',pw_fair:'Regular',pw_good:'Buena',pw_strong:'Fuerte',pw_very_strong:'Muy fuerte',pw_enter:'Introduce una contraseña',
    cat_ads:'Publicidad',cat_trackers:'Rastreadores',cat_malware:'Malware',cat_social:'Redes sociales',cat_telemetry:'Telemetría',cat_adult:'Contenido adulto',
    enabled:'Activado',disabled:'Desactivado',active:'Activo',save:'Guardar',cancel:'Cancelar',delete:'Eliminar',edit:'Editar',add:'Añadir',remove:'Quitar',loading:'Cargando...',never:'Nunca',unknown:'Desconocido',today:'hoy',docker_logs_hint:'Consulta los logs de docker-compose para más detalles',
  },

  it: {
    nav_dashboard:'Pannello',nav_blocklists:'Liste di blocco',nav_rules:'Regole personalizzate',nav_devices:'Dispositivi',nav_vpn:'VPN / WireGuard',nav_query_log:'Registro query',nav_security:'Sicurezza',nav_settings:'Impostazioni',nav_logout:'Esci',
    dash_title:'Pannello',dash_queries:'Query oggi',dash_blocked:'Bloccati oggi',dash_block_rate:'Tasso di blocco',dash_active_lists:'Liste attive',dash_domains:'Domini bloccati',dash_devices:'Dispositivi',dash_vpn_status:'Stato VPN',dash_uptime:'Disponibilità',dash_recent_log:'Query recenti',dash_audit:'Registro di audit',
    bl_title:'Liste di blocco',bl_add:'Aggiungi lista',bl_sync:'Sincronizza tutto',bl_name:'Nome',bl_source:'Fonte',bl_domains:'Domini',bl_updated:'Ultimo aggiornamento',bl_enabled:'Abilitato',bl_empty:'Nessuna lista aggiunta',bl_enter_name:'Nome della lista',bl_preset_loaded:'Preset caricato — clicca Aggiungi',bl_enabled_msg:'Lista abilitata',bl_disabled_msg:'Lista disabilitata',bl_removed_msg:'Lista rimossa',bl_synced_msg:'Liste sincronizzate',bl_syncing:'Sincronizzazione...',bl_parsed:'Analizzato',bl_domains_suffix:'domini',
    rules_title:'Regole personalizzate',rules_add:'Aggiungi regola',rules_domain:'Dominio',rules_action:'Azione',rules_allow:'Consenti',rules_block:'Blocca',rules_empty:'Nessuna regola definita',rules_added:'Regola aggiunta',rules_removed:'Regola rimossa',
    dev_title:'Dispositivi',dev_add:'Aggiungi dispositivo',dev_name:'Nome dispositivo',dev_ip:'Indirizzo IP',dev_last_seen:'Ultima vista',dev_empty:'Nessun dispositivo — aggiungine uno dalla pagina VPN',dev_removed:'Dispositivo rimosso',dev_enter_name:'Nome del dispositivo',
    vpn_title:'VPN / WireGuard',vpn_status:'Stato VPN',vpn_active:'Crittografato e attivo',vpn_offline:'Non in linea',vpn_add_device:'Aggiungi dispositivo',vpn_qr:'Mostra codice QR',vpn_no_vpn:'Avvia VPN dalla pagina VPN',vpn_control:'Controllo VPN via docker compose — vedi Impostazioni',vpn_tunnel:'Tunnel Cloudflare',vpn_off:'VPN spento',vpn_tunnel_down:'Tunnel inattivo',
    log_title:'Registro query',log_empty:'Nessuna query registrata',log_allowed:'Consentito',log_blocked:'Bloccato',log_domain:'Dominio',log_client:'Client',log_time:'Ora',
    sec_title:'Sicurezza',sec_change_pw:'Cambia password',sec_current_pw:'Password attuale',sec_new_pw:'Nuova password',sec_confirm_pw:'Conferma nuova password',sec_save_pw:'Salva',sec_cancel:'Annulla',sec_2fa:'Autenticazione a due fattori',sec_audit:'Registro di audit',sec_audit_empty:'Nessuna voce di audit',sec_pw_changed:'Password modificata',sec_pw_failed:'Errore — controlla la password attuale',sec_pw_mismatch:'Le password non corrispondono',sec_pw_short:'La password deve avere almeno 12 caratteri',sec_all_required:'Tutti i campi sono obbligatori',sec_totp_soon:'Configurazione TOTP in arrivo',
    set_title:'Impostazioni',set_hostname:'Nome host',set_upstream_dns:'DNS upstream',set_timezone:'Fuso orario',set_save:'Salva impostazioni',set_saved:'Impostazioni salvate',set_language:'Lingua',set_proxy:'Proxy inverso',set_allowed_hosts:'Host consentiti',set_version:'Versione',
    ob_setup:'Configurazione iniziale',ob_account:'Account',ob_network:'Rete',ob_blocklists:'Liste di blocco',ob_vpn:'VPN',ob_done:'Fatto',ob_create_account:'Crea il tuo account',ob_account_sub:'Questo è l\'unico account per la tua installazione HexBlock. Conserva queste credenziali al sicuro.',ob_username:'Nome utente',ob_password:'Password',ob_pw_placeholder:'Minimo 12 caratteri',ob_confirm_pw:'Conferma password',ob_confirm_ph:'Ripeti la password',ob_continue:'Continua',ob_back:'Indietro',ob_network_title:'Configurazione rete',ob_network_sub:'Configura come HexBlock si connette a Internet.',ob_hostname:'Nome host',ob_hostname_hint:'Come i dispositivi raggiungono HexBlock',ob_upstream_dns:'DNS upstream',ob_upstream_hint:'Le query consentite vengono inoltrate qui',ob_timezone:'Fuso orario',ob_bl_title:'Scegli liste di blocco',ob_bl_sub:'Seleziona le categorie da bloccare.',ob_recommended:'Consigliato',ob_vpn_title:'Configurazione VPN',ob_vpn_sub:'HexBlock usa WireGuard per crittografare il traffico.',ob_vpn_auto:'Configurazione automatica',ob_vpn_auto_desc:'HexBlock genera le chiavi automaticamente.',ob_vpn_manual:'Manuale',ob_vpn_manual_desc:'Fornisci le tue chiavi WireGuard.',ob_vpn_dns_only:'Solo DNS',ob_vpn_dns_desc:'Blocca senza tunnel VPN. Il traffico non è crittografato.',ob_vpn_skip:'Salta per ora',ob_vpn_skip_desc:'Configura VPN in seguito.',ob_finish:'Completa configurazione',
    login_title:'Accedi',login_username:'Nome utente',login_password:'Password',login_submit:'Accedi',login_totp:'Codice autenticatore',login_locked:'Troppi tentativi. Attendi 5 minuti.',login_attempts:'{n} tentativo rimanente prima del blocco.',login_attempts_p:'{n} tentativi rimanenti prima del blocco.',
    pw_too_short:'Troppo corta',pw_weak:'Debole',pw_fair:'Discreta',pw_good:'Buona',pw_strong:'Forte',pw_very_strong:'Molto forte',pw_enter:'Inserisci una password',
    cat_ads:'Pubblicità',cat_trackers:'Tracker',cat_malware:'Malware',cat_social:'Social media',cat_telemetry:'Telemetria',cat_adult:'Contenuto adulti',
    enabled:'Abilitato',disabled:'Disabilitato',active:'Attivo',save:'Salva',cancel:'Annulla',delete:'Elimina',edit:'Modifica',add:'Aggiungi',remove:'Rimuovi',loading:'Caricamento...',never:'Mai',unknown:'Sconosciuto',today:'oggi',docker_logs_hint:'Controlla i log di docker-compose per i dettagli',
  },

  pt: {
    nav_dashboard:'Painel',nav_blocklists:'Listas de bloqueio',nav_rules:'Regras personalizadas',nav_devices:'Dispositivos',nav_vpn:'VPN / WireGuard',nav_query_log:'Registro de consultas',nav_security:'Segurança',nav_settings:'Configurações',nav_logout:'Sair',
    dash_title:'Painel',dash_queries:'Consultas hoje',dash_blocked:'Bloqueados hoje',dash_block_rate:'Taxa de bloqueio',dash_active_lists:'Listas ativas',dash_domains:'Domínios bloqueados',dash_devices:'Dispositivos',dash_vpn_status:'Status VPN',dash_uptime:'Tempo de atividade',dash_recent_log:'Consultas recentes',dash_audit:'Registro de auditoria',
    bl_title:'Listas de bloqueio',bl_add:'Adicionar lista',bl_sync:'Sincronizar tudo',bl_name:'Nome',bl_source:'Fonte',bl_domains:'Domínios',bl_updated:'Última atualização',bl_enabled:'Habilitado',bl_empty:'Nenhuma lista adicionada',bl_enter_name:'Nome da lista',bl_preset_loaded:'Predefinição carregada — clique em Adicionar',bl_enabled_msg:'Lista habilitada',bl_disabled_msg:'Lista desabilitada',bl_removed_msg:'Lista removida',bl_synced_msg:'Listas sincronizadas',bl_syncing:'Sincronizando...',bl_parsed:'Analisado',bl_domains_suffix:'domínios',
    rules_title:'Regras personalizadas',rules_add:'Adicionar regra',rules_domain:'Domínio',rules_action:'Ação',rules_allow:'Permitir',rules_block:'Bloquear',rules_empty:'Nenhuma regra definida',rules_added:'Regra adicionada',rules_removed:'Regra removida',
    dev_title:'Dispositivos',dev_add:'Adicionar dispositivo',dev_name:'Nome do dispositivo',dev_ip:'Endereço IP',dev_last_seen:'Último acesso',dev_empty:'Nenhum dispositivo — adicione um na página VPN',dev_removed:'Dispositivo removido',dev_enter_name:'Nome do dispositivo',
    vpn_title:'VPN / WireGuard',vpn_status:'Status VPN',vpn_active:'Criptografado e ativo',vpn_offline:'Offline',vpn_add_device:'Adicionar dispositivo',vpn_qr:'Mostrar código QR',vpn_no_vpn:'Inicie o VPN na página VPN',vpn_control:'Controle VPN via docker compose — veja Configurações',vpn_tunnel:'Túnel Cloudflare',vpn_off:'VPN desligado',vpn_tunnel_down:'Túnel inativo',
    log_title:'Registro de consultas',log_empty:'Nenhuma consulta registrada',log_allowed:'Permitido',log_blocked:'Bloqueado',log_domain:'Domínio',log_client:'Cliente',log_time:'Hora',
    sec_title:'Segurança',sec_change_pw:'Alterar senha',sec_current_pw:'Senha atual',sec_new_pw:'Nova senha',sec_confirm_pw:'Confirmar nova senha',sec_save_pw:'Salvar',sec_cancel:'Cancelar',sec_2fa:'Autenticação de dois fatores',sec_audit:'Registro de auditoria',sec_audit_empty:'Nenhuma entrada de auditoria',sec_pw_changed:'Senha alterada',sec_pw_failed:'Falha — verifique sua senha atual',sec_pw_mismatch:'As senhas não coincidem',sec_pw_short:'A senha deve ter pelo menos 12 caracteres',sec_all_required:'Todos os campos são obrigatórios',sec_totp_soon:'Configuração TOTP em breve',
    set_title:'Configurações',set_hostname:'Nome do host',set_upstream_dns:'DNS upstream',set_timezone:'Fuso horário',set_save:'Salvar configurações',set_saved:'Configurações salvas',set_language:'Idioma',set_proxy:'Proxy reverso',set_allowed_hosts:'Hosts permitidos',set_version:'Versão',
    ob_setup:'Configuração inicial',ob_account:'Conta',ob_network:'Rede',ob_blocklists:'Listas de bloqueio',ob_vpn:'VPN',ob_done:'Concluído',ob_create_account:'Criar sua conta',ob_account_sub:'Esta é a única conta da sua instalação HexBlock. Guarde estas credenciais em segurança.',ob_username:'Usuário',ob_password:'Senha',ob_pw_placeholder:'Mínimo 12 caracteres',ob_confirm_pw:'Confirmar senha',ob_confirm_ph:'Repita a senha',ob_continue:'Continuar',ob_back:'Voltar',ob_network_title:'Configuração de rede',ob_network_sub:'Configure como o HexBlock se conecta à Internet.',ob_hostname:'Nome do host',ob_hostname_hint:'Como os dispositivos acessam o HexBlock',ob_upstream_dns:'DNS upstream',ob_upstream_hint:'Consultas permitidas são encaminhadas aqui',ob_timezone:'Fuso horário',ob_bl_title:'Escolher listas de bloqueio',ob_bl_sub:'Selecione quais categorias bloquear.',ob_recommended:'Recomendado',ob_vpn_title:'Configuração VPN',ob_vpn_sub:'HexBlock usa WireGuard para criptografar o tráfego.',ob_vpn_auto:'Configuração automática',ob_vpn_auto_desc:'HexBlock gera chaves automaticamente.',ob_vpn_manual:'Manual',ob_vpn_manual_desc:'Forneça suas próprias chaves WireGuard.',ob_vpn_dns_only:'Apenas DNS',ob_vpn_dns_desc:'Bloqueio sem túnel VPN. Tráfego não criptografado.',ob_vpn_skip:'Pular por agora',ob_vpn_skip_desc:'Configure VPN mais tarde.',ob_finish:'Concluir configuração',
    login_title:'Entrar',login_username:'Usuário',login_password:'Senha',login_submit:'Entrar',login_totp:'Código do autenticador',login_locked:'Muitas tentativas. Aguarde 5 minutos.',login_attempts:'{n} tentativa restante antes do bloqueio.',login_attempts_p:'{n} tentativas restantes antes do bloqueio.',
    pw_too_short:'Muito curta',pw_weak:'Fraca',pw_fair:'Regular',pw_good:'Boa',pw_strong:'Forte',pw_very_strong:'Muito forte',pw_enter:'Digite uma senha',
    cat_ads:'Publicidade',cat_trackers:'Rastreadores',cat_malware:'Malware',cat_social:'Redes sociais',cat_telemetry:'Telemetria',cat_adult:'Conteúdo adulto',
    enabled:'Habilitado',disabled:'Desabilitado',active:'Ativo',save:'Salvar',cancel:'Cancelar',delete:'Excluir',edit:'Editar',add:'Adicionar',remove:'Remover',loading:'Carregando...',never:'Nunca',unknown:'Desconhecido',today:'hoje',docker_logs_hint:'Verifique os logs do docker-compose para detalhes',
  },

  nl: {
    nav_dashboard:'Dashboard',nav_blocklists:'Blokkeringslijsten',nav_rules:'Aangepaste regels',nav_devices:'Apparaten',nav_vpn:'VPN / WireGuard',nav_query_log:'Querylogboek',nav_security:'Beveiliging',nav_settings:'Instellingen',nav_logout:'Afmelden',
    dash_title:'Dashboard',dash_queries:'Queries vandaag',dash_blocked:'Geblokkeerd vandaag',dash_block_rate:'Blokkeringspercentage',dash_active_lists:'Actieve lijsten',dash_domains:'Geblokkeerde domeinen',dash_devices:'Apparaten',dash_vpn_status:'VPN-status',dash_uptime:'Uptime',dash_recent_log:'Recente queries',dash_audit:'Auditlogboek',
    bl_title:'Blokkeringslijsten',bl_add:'Lijst toevoegen',bl_sync:'Alles synchroniseren',bl_name:'Naam',bl_source:'Bron',bl_domains:'Domeinen',bl_updated:'Laatst bijgewerkt',bl_enabled:'Ingeschakeld',bl_empty:'Geen lijsten toegevoegd',bl_enter_name:'Lijstnaam invoeren',bl_preset_loaded:'Voorinstelling geladen — klik op Toevoegen',bl_enabled_msg:'Lijst ingeschakeld',bl_disabled_msg:'Lijst uitgeschakeld',bl_removed_msg:'Lijst verwijderd',bl_synced_msg:'Lijsten gesynchroniseerd',bl_syncing:'Synchroniseren...',bl_parsed:'Geanalyseerd',bl_domains_suffix:'domeinen',
    rules_title:'Aangepaste regels',rules_add:'Regel toevoegen',rules_domain:'Domein',rules_action:'Actie',rules_allow:'Toestaan',rules_block:'Blokkeren',rules_empty:'Geen regels gedefinieerd',rules_added:'Regel toegevoegd',rules_removed:'Regel verwijderd',
    dev_title:'Apparaten',dev_add:'Apparaat toevoegen',dev_name:'Apparaatnaam',dev_ip:'IP-adres',dev_last_seen:'Laatst gezien',dev_empty:'Geen apparaten — voeg er een toe via de VPN-pagina',dev_removed:'Apparaat verwijderd',dev_enter_name:'Apparaatnaam invoeren',
    vpn_title:'VPN / WireGuard',vpn_status:'VPN-status',vpn_active:'Versleuteld en actief',vpn_offline:'Offline',vpn_add_device:'Apparaat toevoegen',vpn_qr:'QR-code tonen',vpn_no_vpn:'Start VPN via de VPN-pagina',vpn_control:'VPN-beheer via docker compose — zie Instellingen',vpn_tunnel:'Cloudflare-tunnel',vpn_off:'VPN uit',vpn_tunnel_down:'Tunnel niet actief',
    log_title:'Querylogboek',log_empty:'Geen queries gelogd',log_allowed:'Toegestaan',log_blocked:'Geblokkeerd',log_domain:'Domein',log_client:'Client',log_time:'Tijd',
    sec_title:'Beveiliging',sec_change_pw:'Wachtwoord wijzigen',sec_current_pw:'Huidig wachtwoord',sec_new_pw:'Nieuw wachtwoord',sec_confirm_pw:'Nieuw wachtwoord bevestigen',sec_save_pw:'Opslaan',sec_cancel:'Annuleren',sec_2fa:'Twee-factorauthenticatie',sec_audit:'Auditlogboek',sec_audit_empty:'Geen auditinvoeren',sec_pw_changed:'Wachtwoord gewijzigd',sec_pw_failed:'Mislukt — controleer uw huidige wachtwoord',sec_pw_mismatch:'Wachtwoorden komen niet overeen',sec_pw_short:'Wachtwoord moet minimaal 12 tekens hebben',sec_all_required:'Alle velden zijn verplicht',sec_totp_soon:'TOTP-configuratie binnenkort',
    set_title:'Instellingen',set_hostname:'Hostnaam',set_upstream_dns:'Upstream DNS',set_timezone:'Tijdzone',set_save:'Instellingen opslaan',set_saved:'Instellingen opgeslagen',set_language:'Taal',set_proxy:'Reverse proxy',set_allowed_hosts:'Toegestane hosts',set_version:'Versie',
    ob_setup:'Eerste installatie',ob_account:'Account',ob_network:'Netwerk',ob_blocklists:'Blokkeringslijsten',ob_vpn:'VPN',ob_done:'Klaar',ob_create_account:'Account aanmaken',ob_account_sub:'Dit is het enige account voor uw HexBlock-installatie. Bewaar deze gegevens veilig.',ob_username:'Gebruikersnaam',ob_password:'Wachtwoord',ob_pw_placeholder:'Minimaal 12 tekens',ob_confirm_pw:'Wachtwoord bevestigen',ob_confirm_ph:'Herhaal wachtwoord',ob_continue:'Doorgaan',ob_back:'Terug',ob_network_title:'Netwerkconfiguratie',ob_network_sub:'Configureer hoe HexBlock verbinding maakt met internet.',ob_hostname:'Hostnaam',ob_hostname_hint:'Hoe apparaten HexBlock bereiken',ob_upstream_dns:'Upstream DNS',ob_upstream_hint:'Toegestane queries worden hierheen doorgestuurd',ob_timezone:'Tijdzone',ob_bl_title:'Blokkeringslijsten kiezen',ob_bl_sub:'Selecteer welke categorieën geblokkeerd worden.',ob_recommended:'Aanbevolen',ob_vpn_title:'VPN-configuratie',ob_vpn_sub:'HexBlock gebruikt WireGuard om verkeer te versleutelen.',ob_vpn_auto:'Automatische installatie',ob_vpn_auto_desc:'HexBlock genereert automatisch sleutels.',ob_vpn_manual:'Handmatig',ob_vpn_manual_desc:'Geef uw eigen WireGuard-sleutels op.',ob_vpn_dns_only:'Alleen DNS',ob_vpn_dns_desc:'Blokkeren zonder VPN-tunnel. Verkeer niet versleuteld.',ob_vpn_skip:'Nu overslaan',ob_vpn_skip_desc:'VPN later configureren.',ob_finish:'Installatie voltooien',
    login_title:'Aanmelden',login_username:'Gebruikersnaam',login_password:'Wachtwoord',login_submit:'Aanmelden',login_totp:'Authenticatiecode',login_locked:'Te veel pogingen. Wacht 5 minuten.',login_attempts:'{n} poging resterend voor vergrendeling.',login_attempts_p:'{n} pogingen resterend voor vergrendeling.',
    pw_too_short:'Te kort',pw_weak:'Zwak',pw_fair:'Matig',pw_good:'Goed',pw_strong:'Sterk',pw_very_strong:'Zeer sterk',pw_enter:'Voer een wachtwoord in',
    cat_ads:'Advertenties',cat_trackers:'Trackers',cat_malware:'Malware',cat_social:'Sociale media',cat_telemetry:'Telemetrie',cat_adult:'Volwassen inhoud',
    enabled:'Ingeschakeld',disabled:'Uitgeschakeld',active:'Actief',save:'Opslaan',cancel:'Annuleren',delete:'Verwijderen',edit:'Bewerken',add:'Toevoegen',remove:'Verwijderen',loading:'Laden...',never:'Nooit',unknown:'Onbekend',today:'vandaag',docker_logs_hint:'Controleer docker-compose logs voor details',
  },

  pl: {
    nav_dashboard:'Panel',nav_blocklists:'Listy blokowania',nav_rules:'Reguły własne',nav_devices:'Urządzenia',nav_vpn:'VPN / WireGuard',nav_query_log:'Dziennik zapytań',nav_security:'Bezpieczeństwo',nav_settings:'Ustawienia',nav_logout:'Wyloguj',
    dash_title:'Panel',dash_queries:'Zapytania dzisiaj',dash_blocked:'Zablokowane dzisiaj',dash_block_rate:'Wskaźnik blokowania',dash_active_lists:'Aktywne listy',dash_domains:'Zablokowane domeny',dash_devices:'Urządzenia',dash_vpn_status:'Status VPN',dash_uptime:'Czas pracy',dash_recent_log:'Ostatnie zapytania',dash_audit:'Dziennik audytu',
    bl_title:'Listy blokowania',bl_add:'Dodaj listę',bl_sync:'Synchronizuj wszystko',bl_name:'Nazwa',bl_source:'Źródło',bl_domains:'Domeny',bl_updated:'Ostatnia aktualizacja',bl_enabled:'Włączono',bl_empty:'Brak dodanych list',bl_enter_name:'Nazwa listy',bl_preset_loaded:'Preset załadowany — kliknij Dodaj',bl_enabled_msg:'Lista włączona',bl_disabled_msg:'Lista wyłączona',bl_removed_msg:'Lista usunięta',bl_synced_msg:'Listy zsynchronizowane',bl_syncing:'Synchronizowanie...',bl_parsed:'Przeanalizowano',bl_domains_suffix:'domen',
    rules_title:'Reguły własne',rules_add:'Dodaj regułę',rules_domain:'Domena',rules_action:'Akcja',rules_allow:'Zezwól',rules_block:'Blokuj',rules_empty:'Brak zdefiniowanych reguł',rules_added:'Reguła dodana',rules_removed:'Reguła usunięta',
    dev_title:'Urządzenia',dev_add:'Dodaj urządzenie',dev_name:'Nazwa urządzenia',dev_ip:'Adres IP',dev_last_seen:'Ostatnio widziano',dev_empty:'Brak urządzeń — dodaj jedno ze strony VPN',dev_removed:'Urządzenie usunięte',dev_enter_name:'Nazwa urządzenia',
    vpn_title:'VPN / WireGuard',vpn_status:'Status VPN',vpn_active:'Zaszyfrowany i aktywny',vpn_offline:'Offline',vpn_add_device:'Dodaj urządzenie',vpn_qr:'Pokaż kod QR',vpn_no_vpn:'Uruchom VPN ze strony VPN',vpn_control:'Kontrola VPN przez docker compose — patrz Ustawienia',vpn_tunnel:'Tunel Cloudflare',vpn_off:'VPN wyłączony',vpn_tunnel_down:'Tunel nieaktywny',
    log_title:'Dziennik zapytań',log_empty:'Brak zarejestrowanych zapytań',log_allowed:'Dozwolone',log_blocked:'Zablokowane',log_domain:'Domena',log_client:'Klient',log_time:'Czas',
    sec_title:'Bezpieczeństwo',sec_change_pw:'Zmień hasło',sec_current_pw:'Aktualne hasło',sec_new_pw:'Nowe hasło',sec_confirm_pw:'Potwierdź nowe hasło',sec_save_pw:'Zapisz',sec_cancel:'Anuluj',sec_2fa:'Uwierzytelnianie dwuskładnikowe',sec_audit:'Dziennik audytu',sec_audit_empty:'Brak wpisów audytu',sec_pw_changed:'Hasło zmienione',sec_pw_failed:'Błąd — sprawdź aktualne hasło',sec_pw_mismatch:'Hasła nie pasują',sec_pw_short:'Hasło musi mieć co najmniej 12 znaków',sec_all_required:'Wszystkie pola są wymagane',sec_totp_soon:'Konfiguracja TOTP wkrótce',
    set_title:'Ustawienia',set_hostname:'Nazwa hosta',set_upstream_dns:'DNS upstream',set_timezone:'Strefa czasowa',set_save:'Zapisz ustawienia',set_saved:'Ustawienia zapisane',set_language:'Język',set_proxy:'Odwrotny proxy',set_allowed_hosts:'Dozwolone hosty',set_version:'Wersja',
    ob_setup:'Pierwsze uruchomienie',ob_account:'Konto',ob_network:'Sieć',ob_blocklists:'Listy blokowania',ob_vpn:'VPN',ob_done:'Gotowe',ob_create_account:'Utwórz konto',ob_account_sub:'To jedyne konto w instalacji HexBlock. Przechowuj te dane bezpiecznie.',ob_username:'Nazwa użytkownika',ob_password:'Hasło',ob_pw_placeholder:'Minimum 12 znaków',ob_confirm_pw:'Potwierdź hasło',ob_confirm_ph:'Powtórz hasło',ob_continue:'Kontynuuj',ob_back:'Wstecz',ob_network_title:'Konfiguracja sieci',ob_network_sub:'Skonfiguruj połączenie HexBlock z internetem.',ob_hostname:'Nazwa hosta',ob_hostname_hint:'Jak urządzenia docierają do HexBlock',ob_upstream_dns:'DNS upstream',ob_upstream_hint:'Dozwolone zapytania są przekazywane tutaj',ob_timezone:'Strefa czasowa',ob_bl_title:'Wybierz listy blokowania',ob_bl_sub:'Wybierz kategorie do blokowania.',ob_recommended:'Zalecane',ob_vpn_title:'Konfiguracja VPN',ob_vpn_sub:'HexBlock używa WireGuard do szyfrowania ruchu.',ob_vpn_auto:'Automatyczna konfiguracja',ob_vpn_auto_desc:'HexBlock automatycznie generuje klucze.',ob_vpn_manual:'Ręczna',ob_vpn_manual_desc:'Podaj własne klucze WireGuard.',ob_vpn_dns_only:'Tylko DNS',ob_vpn_dns_desc:'Blokowanie bez tunelu VPN. Ruch nie jest zaszyfrowany.',ob_vpn_skip:'Pomiń na razie',ob_vpn_skip_desc:'Skonfiguruj VPN później.',ob_finish:'Zakończ konfigurację',
    login_title:'Zaloguj się',login_username:'Nazwa użytkownika',login_password:'Hasło',login_submit:'Zaloguj',login_totp:'Kod uwierzytelniający',login_locked:'Zbyt wiele prób. Odczekaj 5 minut.',login_attempts:'Pozostała {n} próba przed zablokowaniem.',login_attempts_p:'Pozostały {n} próby przed zablokowaniem.',
    pw_too_short:'Za krótkie',pw_weak:'Słabe',pw_fair:'Przeciętne',pw_good:'Dobre',pw_strong:'Silne',pw_very_strong:'Bardzo silne',pw_enter:'Wpisz hasło',
    cat_ads:'Reklamy',cat_trackers:'Trackery',cat_malware:'Złośliwe oprogramowanie',cat_social:'Media społecznościowe',cat_telemetry:'Telemetria',cat_adult:'Treści dla dorosłych',
    enabled:'Włączono',disabled:'Wyłączono',active:'Aktywny',save:'Zapisz',cancel:'Anuluj',delete:'Usuń',edit:'Edytuj',add:'Dodaj',remove:'Usuń',loading:'Ładowanie...',never:'Nigdy',unknown:'Nieznany',today:'dzisiaj',docker_logs_hint:'Sprawdź logi docker-compose po szczegóły',
  },

  ja: {
    nav_dashboard:'ダッシュボード',nav_blocklists:'ブロックリスト',nav_rules:'カスタムルール',nav_devices:'デバイス',nav_vpn:'VPN / WireGuard',nav_query_log:'クエリログ',nav_security:'セキュリティ',nav_settings:'設定',nav_logout:'サインアウト',
    dash_title:'ダッシュボード',dash_queries:'本日のクエリ',dash_blocked:'本日のブロック数',dash_block_rate:'ブロック率',dash_active_lists:'有効なリスト',dash_domains:'ブロックされたドメイン',dash_devices:'デバイス',dash_vpn_status:'VPNステータス',dash_uptime:'稼働時間',dash_recent_log:'最近のクエリ',dash_audit:'監査ログ',
    bl_title:'ブロックリスト',bl_add:'リストを追加',bl_sync:'すべて同期',bl_name:'名前',bl_source:'ソース',bl_domains:'ドメイン',bl_updated:'最終更新',bl_enabled:'有効',bl_empty:'リストが追加されていません',bl_enter_name:'リスト名を入力',bl_preset_loaded:'プリセットを読み込みました — 追加をクリック',bl_enabled_msg:'リストを有効にしました',bl_disabled_msg:'リストを無効にしました',bl_removed_msg:'リストを削除しました',bl_synced_msg:'リストを同期しました',bl_syncing:'同期中...',bl_parsed:'解析済み',bl_domains_suffix:'ドメイン',
    rules_title:'カスタムルール',rules_add:'ルールを追加',rules_domain:'ドメイン',rules_action:'アクション',rules_allow:'許可',rules_block:'ブロック',rules_empty:'ルールが定義されていません',rules_added:'ルールを追加しました',rules_removed:'ルールを削除しました',
    dev_title:'デバイス',dev_add:'デバイスを追加',dev_name:'デバイス名',dev_ip:'IPアドレス',dev_last_seen:'最終確認',dev_empty:'デバイスがありません — VPNページから追加してください',dev_removed:'デバイスを削除しました',dev_enter_name:'デバイス名を入力',
    vpn_title:'VPN / WireGuard',vpn_status:'VPNステータス',vpn_active:'暗号化されアクティブ',vpn_offline:'オフライン',vpn_add_device:'デバイスを追加',vpn_qr:'QRコードを表示',vpn_no_vpn:'VPNページからVPNを開始',vpn_control:'docker composeでVPNを制御 — 設定を参照',vpn_tunnel:'Cloudflareトンネル',vpn_off:'VPNオフ',vpn_tunnel_down:'トンネルが動作していません',
    log_title:'クエリログ',log_empty:'クエリが記録されていません',log_allowed:'許可',log_blocked:'ブロック',log_domain:'ドメイン',log_client:'クライアント',log_time:'時刻',
    sec_title:'セキュリティ',sec_change_pw:'パスワード変更',sec_current_pw:'現在のパスワード',sec_new_pw:'新しいパスワード',sec_confirm_pw:'新しいパスワードを確認',sec_save_pw:'保存',sec_cancel:'キャンセル',sec_2fa:'二要素認証',sec_audit:'監査ログ',sec_audit_empty:'監査エントリがありません',sec_pw_changed:'パスワードを変更しました',sec_pw_failed:'失敗 — 現在のパスワードを確認してください',sec_pw_mismatch:'パスワードが一致しません',sec_pw_short:'パスワードは12文字以上必要です',sec_all_required:'すべてのフィールドが必須です',sec_totp_soon:'TOTP設定は近日公開',
    set_title:'設定',set_hostname:'ホスト名',set_upstream_dns:'上流DNS',set_timezone:'タイムゾーン',set_save:'設定を保存',set_saved:'設定を保存しました',set_language:'言語',set_proxy:'リバースプロキシ',set_allowed_hosts:'許可されたホスト',set_version:'バージョン',
    ob_setup:'初期設定',ob_account:'アカウント',ob_network:'ネットワーク',ob_blocklists:'ブロックリスト',ob_vpn:'VPN',ob_done:'完了',ob_create_account:'アカウントを作成',ob_account_sub:'これはHexBlockインストールの唯一のアカウントです。認証情報を安全に保管してください。',ob_username:'ユーザー名',ob_password:'パスワード',ob_pw_placeholder:'12文字以上',ob_confirm_pw:'パスワードの確認',ob_confirm_ph:'パスワードを再入力',ob_continue:'続ける',ob_back:'戻る',ob_network_title:'ネットワーク設定',ob_network_sub:'HexBlockのインターネット接続を設定します。',ob_hostname:'ホスト名',ob_hostname_hint:'デバイスがHexBlockにアクセスする方法',ob_upstream_dns:'上流DNS',ob_upstream_hint:'許可されたクエリはここに転送されます',ob_timezone:'タイムゾーン',ob_bl_title:'ブロックリストを選択',ob_bl_sub:'ブロックするカテゴリを選択してください。',ob_recommended:'推奨',ob_vpn_title:'VPN設定',ob_vpn_sub:'HexBlockはWireGuardを使用してトラフィックを暗号化します。',ob_vpn_auto:'自動設定',ob_vpn_auto_desc:'HexBlockが自動的に鍵を生成します。',ob_vpn_manual:'手動',ob_vpn_manual_desc:'独自のWireGuard鍵を指定します。',ob_vpn_dns_only:'DNSのみ',ob_vpn_dns_desc:'VPNトンネルなしのブロック。トラフィックは暗号化されません。',ob_vpn_skip:'後で設定',ob_vpn_skip_desc:'後でダッシュボードからVPNを設定します。',ob_finish:'設定を完了',
    login_title:'サインイン',login_username:'ユーザー名',login_password:'パスワード',login_submit:'サインイン',login_totp:'認証コード',login_locked:'試行回数が多すぎます。5分後にお試しください。',login_attempts:'ロックアウトまで{n}回の試行が残っています。',login_attempts_p:'ロックアウトまで{n}回の試行が残っています。',
    pw_too_short:'短すぎます',pw_weak:'弱い',pw_fair:'普通',pw_good:'良い',pw_strong:'強い',pw_very_strong:'非常に強い',pw_enter:'パスワードを入力',
    cat_ads:'広告',cat_trackers:'トラッカー',cat_malware:'マルウェア',cat_social:'ソーシャルメディア',cat_telemetry:'テレメトリ',cat_adult:'アダルトコンテンツ',
    enabled:'有効',disabled:'無効',active:'アクティブ',save:'保存',cancel:'キャンセル',delete:'削除',edit:'編集',add:'追加',remove:'削除',loading:'読み込み中...',never:'なし',unknown:'不明',today:'今日',docker_logs_hint:'詳細はdocker-composeのログを確認してください',
  },

  zh: {
    nav_dashboard:'仪表盘',nav_blocklists:'拦截列表',nav_rules:'自定义规则',nav_devices:'设备',nav_vpn:'VPN / WireGuard',nav_query_log:'查询日志',nav_security:'安全',nav_settings:'设置',nav_logout:'退出登录',
    dash_title:'仪表盘',dash_queries:'今日查询',dash_blocked:'今日拦截',dash_block_rate:'拦截率',dash_active_lists:'启用列表',dash_domains:'已拦截域名',dash_devices:'设备',dash_vpn_status:'VPN状态',dash_uptime:'运行时间',dash_recent_log:'最近查询',dash_audit:'审计日志',
    bl_title:'拦截列表',bl_add:'添加列表',bl_sync:'同步全部',bl_name:'名称',bl_source:'来源',bl_domains:'域名',bl_updated:'最后更新',bl_enabled:'已启用',bl_empty:'尚未添加列表',bl_enter_name:'输入列表名称',bl_preset_loaded:'预设已加载 — 点击添加',bl_enabled_msg:'列表已启用',bl_disabled_msg:'列表已禁用',bl_removed_msg:'列表已删除',bl_synced_msg:'列表已同步',bl_syncing:'同步中...',bl_parsed:'已解析',bl_domains_suffix:'个域名',
    rules_title:'自定义规则',rules_add:'添加规则',rules_domain:'域名',rules_action:'操作',rules_allow:'允许',rules_block:'拦截',rules_empty:'暂无规则',rules_added:'规则已添加',rules_removed:'规则已删除',
    dev_title:'设备',dev_add:'添加设备',dev_name:'设备名称',dev_ip:'IP地址',dev_last_seen:'最后在线',dev_empty:'暂无设备 — 从VPN页面添加',dev_removed:'设备已删除',dev_enter_name:'输入设备名称',
    vpn_title:'VPN / WireGuard',vpn_status:'VPN状态',vpn_active:'已加密且活跃',vpn_offline:'离线',vpn_add_device:'添加设备',vpn_qr:'显示二维码',vpn_no_vpn:'从VPN页面启动VPN',vpn_control:'通过docker compose控制VPN — 查看设置',vpn_tunnel:'Cloudflare隧道',vpn_off:'VPN已关闭',vpn_tunnel_down:'隧道未运行',
    log_title:'查询日志',log_empty:'暂无查询记录',log_allowed:'已允许',log_blocked:'已拦截',log_domain:'域名',log_client:'客户端',log_time:'时间',
    sec_title:'安全',sec_change_pw:'更改密码',sec_current_pw:'当前密码',sec_new_pw:'新密码',sec_confirm_pw:'确认新密码',sec_save_pw:'保存',sec_cancel:'取消',sec_2fa:'双因素认证',sec_audit:'审计日志',sec_audit_empty:'暂无审计记录',sec_pw_changed:'密码已更改',sec_pw_failed:'失败 — 请检查当前密码',sec_pw_mismatch:'密码不匹配',sec_pw_short:'密码至少需要12个字符',sec_all_required:'所有字段均为必填项',sec_totp_soon:'TOTP设置即将推出',
    set_title:'设置',set_hostname:'主机名',set_upstream_dns:'上游DNS',set_timezone:'时区',set_save:'保存设置',set_saved:'设置已保存',set_language:'语言',set_proxy:'反向代理',set_allowed_hosts:'允许的主机',set_version:'版本',
    ob_setup:'初始设置',ob_account:'账户',ob_network:'网络',ob_blocklists:'拦截列表',ob_vpn:'VPN',ob_done:'完成',ob_create_account:'创建您的账户',ob_account_sub:'这是您HexBlock安装的唯一账户。请妥善保管这些凭据。',ob_username:'用户名',ob_password:'密码',ob_pw_placeholder:'至少12个字符',ob_confirm_pw:'确认密码',ob_confirm_ph:'重复密码',ob_continue:'继续',ob_back:'返回',ob_network_title:'网络设置',ob_network_sub:'配置HexBlock的互联网连接方式。',ob_hostname:'主机名',ob_hostname_hint:'设备访问HexBlock的方式',ob_upstream_dns:'上游DNS',ob_upstream_hint:'通过拦截的查询将转发到此处',ob_timezone:'时区',ob_bl_title:'选择拦截列表',ob_bl_sub:'选择要拦截的类别。',ob_recommended:'推荐',ob_vpn_title:'VPN设置',ob_vpn_sub:'HexBlock使用WireGuard加密流量。',ob_vpn_auto:'自动设置',ob_vpn_auto_desc:'HexBlock自动生成密钥。',ob_vpn_manual:'手动',ob_vpn_manual_desc:'提供您自己的WireGuard密钥。',ob_vpn_dns_only:'仅DNS',ob_vpn_dns_desc:'无VPN隧道的拦截。流量未加密。',ob_vpn_skip:'稍后设置',ob_vpn_skip_desc:'稍后从仪表盘配置VPN。',ob_finish:'完成设置',
    login_title:'登录',login_username:'用户名',login_password:'密码',login_submit:'登录',login_totp:'验证码',login_locked:'尝试次数过多，请等待5分钟。',login_attempts:'锁定前还剩{n}次尝试。',login_attempts_p:'锁定前还剩{n}次尝试。',
    pw_too_short:'太短',pw_weak:'弱',pw_fair:'一般',pw_good:'良好',pw_strong:'强',pw_very_strong:'非常强',pw_enter:'请输入密码',
    cat_ads:'广告',cat_trackers:'追踪器',cat_malware:'恶意软件',cat_social:'社交媒体',cat_telemetry:'遥测',cat_adult:'成人内容',
    enabled:'已启用',disabled:'已禁用',active:'活跃',save:'保存',cancel:'取消',delete:'删除',edit:'编辑',add:'添加',remove:'移除',loading:'加载中...',never:'从不',unknown:'未知',today:'今天',docker_logs_hint:'查看docker-compose日志了解详情',
  },
};

// ── Language names for the picker UI ──────────────────────────
const LANGUAGE_NAMES = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  ja: '日本語',
  zh: '中文',
};

// ── Core functions ────────────────────────────────────────────

function detectLocale() {
  // 1. Check saved preference
  const saved = localStorage.getItem('hb_locale');
  if (saved && SUPPORTED.includes(saved)) return saved;

  // 2. Browser language
  const langs = navigator.languages || [navigator.language || 'en'];
  for (const l of langs) {
    const code = l.split('-')[0].toLowerCase();
    if (SUPPORTED.includes(code)) return code;
  }
  return 'en';
}

let _locale = detectLocale();

function getLocale() { return _locale; }

function setLocale(code) {
  if (!SUPPORTED.includes(code)) return;
  _locale = code;
  localStorage.setItem('hb_locale', code);
  document.documentElement.lang = code;

  // Save to server so it persists across devices
  fetch('/api/v1/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: code }),
  }).catch(() => {});

  // Re-render the page with new locale
  applyLocale();
}

/**
 * Translate a key.
 * Supports {variable} substitution: t('login_attempts', {n: 3})
 */
function t(key, vars) {
  const strings = TRANSLATIONS[_locale] || TRANSLATIONS.en;
  let str = strings[key] ?? TRANSLATIONS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}

/**
 * Apply current locale to all elements with a data-i18n attribute.
 * Elements with data-i18n="key" have their textContent replaced.
 * Elements with data-i18n-placeholder="key" have their placeholder replaced.
 * Elements with data-i18n-title="key" have their title attribute replaced.
 */
function applyLocale() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // Update document lang attribute
  document.documentElement.lang = _locale;
}

/**
 * Build a language picker <select> element.
 * Attach to any container with id="lang-picker-wrap".
 */
function buildLanguagePicker(containerId = 'lang-picker-wrap') {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  const sel = document.createElement('select');
  sel.className = 'lang-picker';
  sel.setAttribute('aria-label', 'Language');

  for (const code of SUPPORTED) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = LANGUAGE_NAMES[code];
    if (code === _locale) opt.selected = true;
    sel.appendChild(opt);
  }

  sel.addEventListener('change', e => setLocale(e.target.value));
  wrap.appendChild(sel);
}

// Apply on load
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = _locale;
  applyLocale();
  buildLanguagePicker();
});

// Export for use in other scripts
window.HBI18n = { t, setLocale, getLocale, applyLocale, buildLanguagePicker, SUPPORTED, LANGUAGE_NAMES };

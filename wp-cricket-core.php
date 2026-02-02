
<?php
/**
 * Plugin Name: Cricket-Core 2026 Management Bridge
 * Description: Embeds the Cricket-Core Management System into WordPress with real-time cloud synchronization and backend management.
 * Version: 2.4.0
 * Author: Senior Sports Systems Architect
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class CricketCoreBridge {
    public function __construct() {
        // App Integration
        add_shortcode( 'cricket_core_app', array( $this, 'render_app' ) );
        
        // Public Data Display
        add_shortcode( 'cricket_public_listings', array( $this, 'render_public_listings' ) );

        // Assets & Admin
        add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'register_admin_assets' ) );
        add_action( 'admin_menu', array( $this, 'add_settings_menu' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        
        // API
        add_action( 'rest_api_init', array( $this, 'register_sync_endpoints' ) );
        add_action( 'wp_head', array( $this, 'add_pwa_headers' ) );
        
        // Standalone Mode
        add_action( 'init', array( $this, 'add_standalone_rewrite' ) );
        add_filter( 'query_vars', array( $this, 'add_query_vars' ) );
        add_action( 'template_redirect', array( $this, 'render_standalone_interface' ) );
        
        // Backend Actions (Form Submissions)
        add_action( 'admin_post_cc_save_user_data', array( $this, 'save_user_data_backend' ) );
        add_action( 'admin_post_cc_add_user_backend', array( $this, 'add_user_backend' ) );
        add_action( 'admin_post_cc_delete_user_backend', array( $this, 'delete_user_backend' ) );
        
        add_action( 'admin_post_cc_save_org', array( $this, 'save_org_backend' ) );
        add_action( 'admin_post_cc_delete_org', array( $this, 'delete_org_backend' ) );
        add_action( 'admin_post_cc_save_team', array( $this, 'save_team_backend' ) );
        add_action( 'admin_post_cc_delete_team', array( $this, 'delete_team_backend' ) );

        // SportsPress Sync Action
        add_action( 'admin_post_cc_sync_sportspress', array( $this, 'sync_sportspress_backend' ) );
    }

    // --- STANDALONE APP ROUTING ---

    public function add_standalone_rewrite() {
        add_rewrite_rule( '^cricket-app/?$', 'index.php?cc_standalone=1', 'top' );
    }

    public function add_query_vars( $vars ) {
        $vars[] = 'cc_standalone';
        return $vars;
    }

    public function render_standalone_interface() {
        if ( get_query_var( 'cc_standalone' ) ) {
            $plugin_url = plugins_url( 'dist/', __FILE__ );
            $js_url = plugins_url( 'dist/cricket-core.js', __FILE__ );
            $css_url = plugins_url( 'dist/cricket-core.css', __FILE__ );
            $manifest_url = plugins_url( 'dist/manifest.json', __FILE__ );
            
            $api_settings = array(
                'root' => esc_url_raw( rest_url() ),
                'nonce' => wp_create_nonce( 'wp_rest' ),
                'site_url' => get_site_url(),
                'current_user_id' => get_current_user_id(),
                'gemini_api_key' => get_option('cc_gemini_api_key'),
                'google_client_id' => get_option('cc_google_client_id'),
                'league_name' => get_option('cc_league_name'),
                'plugin_url' => $plugin_url
            );

            ?>
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <meta name="theme-color" content="#0f172a">
                <meta name="apple-mobile-web-app-capable" content="yes">
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
                <meta name="robots" content="noindex, nofollow">
                <link rel="manifest" href="<?php echo esc_url($manifest_url); ?>">
                <title>Cricket-Core 2026 | App Mode</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <script src="https://accounts.google.com/gsi/client" async defer></script>
                <link rel="stylesheet" href="<?php echo esc_url($css_url); ?>">
                <script>
                    var wpApiSettings = <?php echo json_encode($api_settings); ?>;
                </script>
                <style>
                    body, html { margin: 0; padding: 0; background-color: #0f172a; overflow: hidden; height: 100%; width: 100%; }
                    #root { height: 100%; width: 100%; }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script type="module" src="<?php echo esc_url($js_url); ?>"></script>
            </body>
            </html>
            <?php
            exit;
        }
    }

    // --- REST API SYNC ENDPOINTS ---
    
    public function register_sync_endpoints() {
        register_rest_route( 'cricket-core/v1', '/sync', array(
            'methods' => 'GET',
            'callback' => array( $this, 'get_global_state' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'cricket-core/v1', '/sync', array(
            'methods' => 'POST',
            'callback' => array( $this, 'update_global_state' ),
            'permission_callback' => function() {
                return current_user_can( 'edit_posts' ) || is_user_logged_in();
            },
        ) );

        register_rest_route( 'cricket-core/v1', '/user', array(
            'methods' => 'GET',
            'callback' => array( $this, 'get_user_data' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'cricket-core/v1', '/user', array(
            'methods' => 'POST',
            'callback' => array( $this, 'update_user_data' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public function get_global_state() {
        $state = get_option( 'cc_global_state', array(
            'orgs' => array(),
            'standaloneMatches' => array(),
            'mediaPosts' => array()
        ) );
        return new WP_REST_Response( $state, 200 );
    }

    public function update_global_state( $request ) {
        $new_state = $request->get_json_params();
        if ( empty( $new_state ) ) {
            return new WP_Error( 'invalid_data', 'No data provided', array( 'status' => 400 ) );
        }
        update_option( 'cc_global_state', $new_state );
        return new WP_REST_Response( array( 'success' => true ), 200 );
    }

    public function get_user_data( $request ) {
        $user_id = $request->get_param('user_id');
        if ( empty( $user_id ) ) {
            return new WP_Error( 'missing_id', 'User ID is required', array( 'status' => 400 ) );
        }
        $data = get_option( 'cc_user_' . sanitize_key( $user_id ), null );
        return new WP_REST_Response( $data, 200 );
    }

    public function update_user_data( $request ) {
        $user_id = $request->get_param('user_id');
        $data = $request->get_json_params();
        if ( empty( $user_id ) || empty( $data ) ) {
            return new WP_Error( 'invalid_request', 'Missing User ID or Data', array( 'status' => 400 ) );
        }
        update_option( 'cc_user_' . sanitize_key( $user_id ), $data );
        return new WP_REST_Response( array( 'success' => true ), 200 );
    }

    // --- ASSETS ---

    public function register_assets() {
        wp_enqueue_style( 'cricket-core-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap', array(), null );
        wp_register_script( 'tailwind-cdn', 'https://cdn.tailwindcss.com', array(), '3.4.17', false );
        wp_register_script( 'cricket-core-js', plugins_url( 'dist/cricket-core.js', __FILE__ ), array(), '2.4.0', true );
        wp_register_style( 'cricket-core-css', plugins_url( 'dist/cricket-core.css', __FILE__ ), array(), '2.4.0' );

        wp_localize_script( 'cricket-core-js', 'wpApiSettings', array(
            'root' => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
            'site_url' => get_site_url(),
            'current_user_id' => get_current_user_id(),
            'gemini_api_key' => get_option('cc_gemini_api_key'),
            'google_client_id' => get_option('cc_google_client_id'),
            'league_name' => get_option('cc_league_name'),
            'plugin_url' => plugins_url( 'dist/', __FILE__ )
        ) );
    }

    public function register_admin_assets() {
        wp_enqueue_media();
        ?>
        <script>
        jQuery(document).ready(function($){
            var mediaUploader;
            $(document).on('click', '.cc-upload-btn', function(e) {
                e.preventDefault();
                var button = $(this);
                if (mediaUploader) { mediaUploader.open(); return; }
                mediaUploader = wp.media.frames.file_frame = wp.media({
                    title: 'Select Image',
                    button: { text: 'Use Image' },
                    multiple: false
                });
                mediaUploader.on('select', function() {
                    var attachment = mediaUploader.state().get('selection').first().toJSON();
                    button.prev('.cc-image-input').val(attachment.url);
                    button.parent().find('.cc-image-preview').attr('src', attachment.url).show();
                });
                mediaUploader.open();
            });
        });
        </script>
        <style>
            .cc-admin-card { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ccd0d4; box-shadow: 0 1px 1px rgba(0,0,0,.04); margin-bottom: 20px; }
            .cc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
            .cc-team-item { border: 1px solid #eee; padding: 10px; border-radius: 4px; display: flex; align-items: center; gap: 10px; background: #fafafa; }
            .cc-image-preview { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; background: #eee; }
            .badge { background: #2271b1; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
            .sp-notice { background: #d1fae5; border: 1px solid #34d399; color: #065f46; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        </style>
        <?php
    }

    public function add_pwa_headers() {
        $manifest_url = plugins_url( 'dist/manifest.json', __FILE__ );
        echo '<meta name="theme-color" content="#0f172a" />' . "\n";
        echo '<meta name="apple-mobile-web-app-capable" content="yes" />' . "\n";
        echo '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />' . "\n";
        echo '<link rel="manifest" href="' . esc_url( $manifest_url ) . '" />' . "\n";
    }

    public function render_app( $atts ) {
        wp_enqueue_script( 'tailwind-cdn' );
        wp_enqueue_script( 'cricket-core-js' );
        wp_enqueue_style( 'cricket-core-css' );
        return '<div id="root" class="cricket-core-wp-container"></div>';
    }

    // --- SHORTCODE: Public Listings ---
    
    public function render_public_listings($atts) {
        $data = get_option('cc_global_state', []);
        $orgs = $data['orgs'] ?? [];
        
        ob_start();
        ?>
        <div class="cc-public-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
            <?php foreach($orgs as $org): ?>
                <?php if(isset($org['isPublic']) && $org['isPublic'] === false) continue; ?>
                <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <?php if(!empty($org['logoUrl'])): ?>
                            <img src="<?php echo esc_url($org['logoUrl']); ?>" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" />
                        <?php else: ?>
                            <div style="width: 50px; height: 50px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #9ca3af;">
                                <?php echo substr($org['name'], 0, 1); ?>
                            </div>
                        <?php endif; ?>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800; line-height: 1.2;"><?php echo esc_html($org['name']); ?></h3>
                            <span style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700;"><?php echo esc_html($org['type'] === 'CLUB' ? 'Club' : 'Governing Body'); ?></span>
                        </div>
                    </div>
                    
                    <p style="font-size: 13px; color: #4b5563; margin-bottom: 15px;">
                        <?php echo esc_html($org['groundLocation'] ?? ''); ?> • <?php echo esc_html($org['country'] ?? ''); ?>
                    </p>

                    <h4 style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #9ca3af; margin-bottom: 8px;">Squads</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <?php if(empty($org['memberTeams'])): ?>
                            <span style="font-size: 12px; color: #9ca3af; font-style: italic;">No squads yet.</span>
                        <?php else: ?>
                            <?php foreach($org['memberTeams'] as $team): ?>
                                <div style="display: flex; align-items: center; gap: 6px; background: #f9fafb; padding: 4px 8px; border-radius: 6px; border: 1px solid #f3f4f6;">
                                    <?php if(!empty($team['logoUrl'])): ?>
                                        <img src="<?php echo esc_url($team['logoUrl']); ?>" style="width: 16px; height: 16px; border-radius: 50%;" />
                                    <?php endif; ?>
                                    <span style="font-size: 12px; font-weight: 600; color: #374151;"><?php echo esc_html($team['name']); ?></span>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    // --- ADMIN SETTINGS & MANAGEMENT ---

    public function add_settings_menu() {
        add_menu_page( 'Cricket Core', 'Cricket Core', 'manage_options', 'cricket-core-settings', array( $this, 'settings_page_html' ), 'dashicons-performance', 30 );
        add_submenu_page( 'cricket-core-settings', 'Manage Org & Squads', 'Manage Org & Squads', 'manage_options', 'cricket-core-manager', array( $this, 'manager_page_html' ) );
        add_submenu_page( 'cricket-core-settings', 'App Users', 'App Users', 'manage_options', 'cricket-core-users', array( $this, 'users_page_html' ) );
    }

    public function register_settings() {
        register_setting( 'cricket_core_options', 'cc_gemini_api_key' );
        register_setting( 'cricket_core_options', 'cc_league_name' );
        register_setting( 'cricket_core_options', 'cc_google_client_id' );
    }

    public function settings_page_html() {
        ?>
        <div class="wrap">
            <h1>Configuration</h1>
            <form method="post" action="options.php">
                <?php settings_fields( 'cricket_core_options' ); do_settings_sections( 'cricket-core-settings' ); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Gemini AI API Key</th>
                        <td><input type="password" name="cc_gemini_api_key" value="<?php echo esc_attr( get_option('cc_gemini_api_key') ); ?>" class="regular-text" /></td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Google Client ID</th>
                        <td><input type="text" name="cc_google_client_id" value="<?php echo esc_attr( get_option('cc_google_client_id') ); ?>" class="regular-text" /></td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Default League Name</th>
                        <td><input type="text" name="cc_league_name" value="<?php echo esc_attr( get_option('cc_league_name', 'Central Zone 2026') ); ?>" class="regular-text" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function users_page_html() {
        global $wpdb;
        $users = $wpdb->get_results( "SELECT option_name, option_value FROM $wpdb->options WHERE option_name LIKE 'cc_user_%'" );
        ?>
        <div class="wrap">
            <h1 class="wp-heading-inline">App User Data Manager</h1>
            <hr class="wp-header-end">

            <div class="cc-admin-card" style="margin-top: 20px;">
                <h3>Add New App User</h3>
                <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end;">
                    <input type="hidden" name="action" value="cc_add_user_backend">
                    <?php wp_nonce_field('cc_user_action'); ?>
                    
                    <div><label>Handle</label><br><input type="text" name="new_handle" required placeholder="@john.doe"></div>
                    <div><label>Display Name</label><br><input type="text" name="new_name" required placeholder="John Doe"></div>
                    <div><label>Password</label><br><input type="text" name="new_password" required placeholder="secret123"></div>
                    <div>
                        <label>Role</label><br>
                        <select name="new_role">
                            <option value="Player">Player</option>
                            <option value="Scorer">Scorer</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div><button class="button button-primary">Create User</button></div>
                </form>
            </div>

            <div class="cc-admin-card">
                <table class="wp-list-table widefat fixed striped">
                    <thead><tr><th>Handle</th><th>Name</th><th>Role</th><th>Password Reset</th><th>Actions</th></tr></thead>
                    <tbody>
                        <?php 
                        if ( empty($users) ) { echo '<tr><td colspan="5">No users found. Create one above.</td></tr>'; }
                        foreach($users as $u): 
                            $data = json_decode($u->option_value, true);
                            $profile = isset($data['profile']) ? $data['profile'] : null;
                            if(!$profile) continue;
                        ?>
                        <tr>
                            <td><strong><?php echo esc_html($profile['handle']); ?></strong></td>
                            <td><?php echo esc_html($profile['name']); ?></td>
                            <td><span class="badge"><?php echo esc_html($profile['role']); ?></span></td>
                            <td>
                                <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" style="display:flex; gap:5px;">
                                    <input type="hidden" name="action" value="cc_save_user_data">
                                    <input type="hidden" name="user_option_name" value="<?php echo esc_attr($u->option_name); ?>">
                                    <input type="text" name="new_password" value="<?php echo esc_attr($profile['password'] ?? ''); ?>" style="width:120px; font-size:11px;">
                                    <button type="submit" class="button button-small">Save</button>
                                </form>
                            </td>
                            <td>
                                <div style="display:flex; gap:10px;">
                                    <button class="button button-small" onclick="alert('Raw Data: <?php echo esc_js(json_encode($profile)); ?>')">View Raw</button>
                                    <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" onsubmit="return confirm('Delete this user?');">
                                        <input type="hidden" name="action" value="cc_delete_user_backend">
                                        <input type="hidden" name="user_option_name" value="<?php echo esc_attr($u->option_name); ?>">
                                        <?php wp_nonce_field('cc_user_action'); ?>
                                        <button class="button button-link-delete" style="font-size:12px;">Delete</button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }

    // --- FORM HANDLERS ---

    public function add_user_backend() {
        check_admin_referer('cc_user_action');
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        $handle = sanitize_text_field($_POST['new_handle']);
        $name = sanitize_text_field($_POST['new_name']);
        $pass = sanitize_text_field($_POST['new_password']);
        $role = sanitize_text_field($_POST['new_role']);
        $user_id = 'usr-' . uniqid();
        $data = [
            'profile' => [ 'id' => $user_id, 'handle' => $handle, 'name' => $name, 'password' => $pass, 'role' => $role, 'preferences' => [] ],
            'localData' => []
        ];
        update_option('cc_user_' . $user_id, $data);
        wp_redirect(admin_url('admin.php?page=cricket-core-users&user_added=true'));
        exit;
    }

    public function delete_user_backend() {
        check_admin_referer('cc_user_action');
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        $opt_name = sanitize_text_field($_POST['user_option_name']);
        if (strpos($opt_name, 'cc_user_') === 0) { delete_option($opt_name); }
        wp_redirect(admin_url('admin.php?page=cricket-core-users&user_deleted=true'));
        exit;
    }

    public function save_user_data_backend() {
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        $opt_name = sanitize_text_field($_POST['user_option_name']);
        $new_pass = sanitize_text_field($_POST['new_password']);
        $data = get_option($opt_name);
        if ($data && isset($data['profile'])) {
            $data['profile']['password'] = $new_pass;
            update_option($opt_name, $data);
        }
        wp_redirect(admin_url('admin.php?page=cricket-core-users&updated=true'));
        exit;
    }

    public function save_org_backend() {
        check_admin_referer('cc_org_action');
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        $state = get_option('cc_global_state', ['orgs'=>[], 'standaloneMatches'=>[], 'mediaPosts'=>[]]);
        $org_id = isset($_POST['org_id']) ? sanitize_text_field($_POST['org_id']) : 'org-'.uniqid();
        $name = sanitize_text_field($_POST['org_name']);
        $type = sanitize_text_field($_POST['org_type']);
        $loc = sanitize_text_field($_POST['org_location']);
        $country = sanitize_text_field($_POST['org_country']);
        $logo = $_POST['org_logo']; 
        if (strpos($logo, 'data:image') !== 0 && filter_var($logo, FILTER_VALIDATE_URL) === false) { $logo = sanitize_text_field($logo); }
        
        $found = false;
        foreach($state['orgs'] as &$org) {
            if($org['id'] === $org_id) {
                $org['name'] = $name; $org['type'] = $type; $org['groundLocation'] = $loc;
                $org['country'] = $country; $org['logoUrl'] = $logo;
                $found = true; break;
            }
        }
        if (!$found) {
            $new_org = [
                'id' => $org_id, 'name' => $name, 'type' => $type, 'groundLocation' => $loc,
                'country' => $country, 'logoUrl' => $logo, 'memberTeams' => [], 'tournaments' => [],
                'fixtures' => [], 'members' => [], 'applications' => [], 'groups' => [], 'isPublic' => true
            ];
            $state['orgs'][] = $new_org;
        }
        update_option('cc_global_state', $state);
        wp_redirect(admin_url('admin.php?page=cricket-core-manager'.($found ? '&edit_org='.$org_id : '')));
        exit;
    }

    public function delete_org_backend() {
        check_admin_referer('cc_org_action');
        $org_id = sanitize_text_field($_POST['org_id']);
        $state = get_option('cc_global_state', []);
        $state['orgs'] = array_values(array_filter($state['orgs'], function($o) use ($org_id) { return $o['id'] !== $org_id; }));
        update_option('cc_global_state', $state);
        wp_redirect(admin_url('admin.php?page=cricket-core-manager'));
        exit;
    }

    public function save_team_backend() {
        check_admin_referer('cc_team_action');
        $org_id = sanitize_text_field($_POST['org_id']);
        $name = sanitize_text_field($_POST['team_name']);
        $loc = sanitize_text_field($_POST['team_location']);
        $logo = $_POST['team_logo'];
        if (strpos($logo, 'data:image') !== 0 && filter_var($logo, FILTER_VALIDATE_URL) === false) { $logo = sanitize_text_field($logo); }
        $state = get_option('cc_global_state', []);
        foreach($state['orgs'] as &$org) {
            if($org['id'] === $org_id) {
                $new_team = [ 'id' => 'tm-'.uniqid(), 'name' => $name, 'location' => $loc, 'logoUrl' => $logo, 'players' => [], 'management' => 'Admin' ];
                $org['memberTeams'][] = $new_team;
                break;
            }
        }
        update_option('cc_global_state', $state);
        wp_redirect(admin_url('admin.php?page=cricket-core-manager&edit_org='.$org_id));
        exit;
    }

    public function delete_team_backend() {
        check_admin_referer('cc_team_action');
        $org_id = sanitize_text_field($_POST['org_id']);
        $team_id = sanitize_text_field($_POST['team_id']);
        $state = get_option('cc_global_state', []);
        foreach($state['orgs'] as &$org) {
            if($org['id'] === $org_id) {
                $org['memberTeams'] = array_values(array_filter($org['memberTeams'], function($t) use ($team_id) { return $t['id'] !== $team_id; }));
                break;
            }
        }
        update_option('cc_global_state', $state);
        wp_redirect(admin_url('admin.php?page=cricket-core-manager&edit_org='.$org_id));
        exit;
    }

    // --- SPORTSPRESS SYNC ENGINE (NEW) ---

    public function sync_sportspress_backend() {
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        check_admin_referer('cc_sp_sync');

        // Check if SportsPress is active
        if ( !post_type_exists('sp_team') ) {
            wp_die('SportsPress is not active. Please install SportsPress first.');
        }

        // 1. Get current state
        $state = get_option('cc_global_state', ['orgs'=>[], 'standaloneMatches'=>[], 'mediaPosts'=>[]]);
        
        // 2. Ensure "SportsPress Imported League" Org exists
        $league_org_id = 'org-sp-sync';
        $target_org = null;
        $org_index = -1;
        
        foreach($state['orgs'] as $i => $org) {
            if ($org['id'] === $league_org_id) {
                $target_org = $org;
                $org_index = $i;
                break;
            }
        }

        if (!$target_org) {
            $target_org = [
                'id' => $league_org_id,
                'name' => 'SportsPress League',
                'type' => 'GOVERNING_BODY',
                'groundLocation' => 'Sync',
                'country' => 'Global',
                'logoUrl' => '',
                'memberTeams' => [],
                'isPublic' => true
            ];
            // Will append later
        }

        // 3. FETCH SPORTSPRESS TEAMS
        $sp_teams = get_posts(['post_type' => 'sp_team', 'numberposts' => -1]);
        $team_map = []; // Map SP ID to App ID

        foreach ($sp_teams as $sp_team) {
            // Check if team already exists in our org
            $team_id = 'tm-sp-' . $sp_team->ID;
            $team_exists = false;
            
            foreach($target_org['memberTeams'] as $existing) {
                if ($existing['id'] === $team_id) { $team_exists = true; break; }
            }

            if (!$team_exists) {
                // Get Logo
                $logo_id = get_post_thumbnail_id($sp_team->ID);
                $logo_url = $logo_id ? wp_get_attachment_url($logo_id) : '';

                // Get Players for this team
                // SP links players via post meta or taxonomy usually.
                // Simplified: Get all players who have this current team.
                $players = [];
                $sp_players = get_posts([
                    'post_type' => 'sp_player',
                    'numberposts' => -1,
                    'meta_query' => [[ 'key' => 'sp_current_team', 'value' => $sp_team->ID ]]
                ]);

                foreach($sp_players as $sp_p) {
                    $players[] = [
                        'id' => 'plr-sp-' . $sp_p->ID,
                        'name' => $sp_p->post_title,
                        'role' => 'Player', // SP roles are complex taxonomies, simplified here
                        'stats' => []
                    ];
                }

                $target_org['memberTeams'][] = [
                    'id' => $team_id,
                    'name' => $sp_team->post_title,
                    'location' => '',
                    'logoUrl' => $logo_url,
                    'players' => $players,
                    'management' => 'SP Sync'
                ];
            }
        }

        // 4. FETCH FIXTURES (EVENTS)
        // We will push these into standaloneMatches or into the Org if structured. 
        // For simplicity, let's put them in standaloneMatches for the app.
        $sp_events = get_posts(['post_type' => 'sp_event', 'numberposts' => -1, 'post_status' => 'publish']);
        
        foreach($sp_events as $event) {
            $event_id = 'match-sp-' . $event->ID;
            
            // Check existence
            $match_exists = false;
            foreach($state['standaloneMatches'] as $m) {
                if ($m['id'] === $event_id) { $match_exists = true; break; }
            }
            if ($match_exists) continue;

            // Get Teams
            $teams = get_post_meta($event->ID, 'sp_team', false); // Returns array of IDs
            if (count($teams) < 2) continue; // Need 2 teams
            
            $team_a_name = get_the_title($teams[0]);
            $team_b_name = get_the_title($teams[1]);
            $date = get_post_meta($event->ID, 'sp_date', true);
            $venue = get_post_meta($event->ID, 'sp_venue', true); // Returns term ID usually, simplified here

            $state['standaloneMatches'][] = [
                'id' => $event_id,
                'teamA' => ['name' => $team_a_name, 'score' => '0/0'],
                'teamB' => ['name' => $team_b_name, 'score' => '0/0'],
                'date' => $date ? $date : date('Y-m-d'),
                'venue' => 'SportsPress Venue',
                'status' => 'Scheduled'
            ];
        }

        // Save back
        if ($org_index > -1) {
            $state['orgs'][$org_index] = $target_org;
        } else {
            $state['orgs'][] = $target_org;
        }

        update_option('cc_global_state', $state);
        
        wp_redirect(admin_url('admin.php?page=cricket-core-manager&sync_success=1'));
        exit;
    }

    // --- CORE MANAGER UI ---

    public function manager_page_html() {
        $state = get_option('cc_global_state', []);
        $orgs = $state['orgs'] ?? [];
        $edit_org_id = isset($_GET['edit_org']) ? sanitize_text_field($_GET['edit_org']) : null;
        
        // Find editing org
        $editing_org = null;
        if ($edit_org_id) {
            foreach($orgs as $o) { if($o['id'] === $edit_org_id) { $editing_org = $o; break; } }
        }
        ?>
        <div class="wrap">
            <h1 class="wp-heading-inline">Organization & Squad Manager</h1>
            
            <?php if(isset($_GET['sync_success'])): ?>
                <div class="notice notice-success is-dismissible"><p>Successfully synced data from SportsPress!</p></div>
            <?php endif; ?>

            <?php if(!$edit_org_id): ?>
                <a href="<?php echo admin_url('admin.php?page=cricket-core-manager&action=new'); ?>" class="page-title-action">Add New Organization</a>
                <hr class="wp-header-end">

                <?php if ( post_type_exists('sp_team') ): ?>
                    <div class="cc-admin-card sp-notice" style="margin-top:20px;">
                        <h3 style="margin-top:0;">🔗 SportsPress Integration</h3>
                        <p>Import Teams, Players, and Fixtures directly from your SportsPress data.</p>
                        <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                            <input type="hidden" name="action" value="cc_sync_sportspress">
                            <?php wp_nonce_field('cc_sp_sync'); ?>
                            <button class="button button-secondary">Pull Data from SportsPress</button>
                        </form>
                    </div>
                <?php endif; ?>

                <?php if(isset($_GET['action']) && $_GET['action'] === 'new'): ?>
                    <div class="cc-admin-card">
                        <h2>Create New Organization</h2>
                        <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                            <input type="hidden" name="action" value="cc_save_org">
                            <?php wp_nonce_field('cc_org_action'); ?>
                            <table class="form-table">
                                <tr><th>Name</th><td><input type="text" name="org_name" class="regular-text" required></td></tr>
                                <tr><th>Type</th><td><select name="org_type"><option value="CLUB">Club</option><option value="GOVERNING_BODY">Governing Body</option></select></td></tr>
                                <tr><th>Location</th><td><input type="text" name="org_location" class="regular-text" placeholder="City / Stadium"></td></tr>
                                <tr><th>Country</th><td><input type="text" name="org_country" class="regular-text"></td></tr>
                                <tr><th>Logo</th><td><input type="text" name="org_logo" class="regular-text cc-image-input"><button class="button cc-upload-btn">Upload</button></td></tr>
                            </table>
                            <?php submit_button('Create Organization'); ?>
                        </form>
                    </div>
                <?php endif; ?>

                <div class="cc-grid">
                    <?php foreach($orgs as $org): ?>
                        <div class="cc-admin-card">
                            <div style="display:flex; justify-content:space-between; align-items:start;">
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <?php if(!empty($org['logoUrl'])): ?><img src="<?php echo esc_url($org['logoUrl']); ?>" style="width:40px; height:40px; border-radius:4px; object-fit:cover;"><?php endif; ?>
                                    <h3 style="margin:0;"><?php echo esc_html($org['name']); ?></h3>
                                </div>
                                <span class="badge"><?php echo esc_html($org['type']); ?></span>
                            </div>
                            <p style="color:#666; font-size:12px; margin: 10px 0;"><?php echo count($org['memberTeams'] ?? []); ?> Squads • <?php echo esc_html($org['country'] ?? 'Global'); ?></p>
                            <div style="display:flex; gap:5px;">
                                <a href="<?php echo admin_url('admin.php?page=cricket-core-manager&edit_org='.$org['id']); ?>" class="button button-primary">Manage Squads</a>
                                <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" onsubmit="return confirm('Delete this organization?');">
                                    <input type="hidden" name="action" value="cc_delete_org">
                                    <input type="hidden" name="org_id" value="<?php echo esc_attr($org['id']); ?>">
                                    <?php wp_nonce_field('cc_org_action'); ?>
                                    <button class="button button-link-delete">Delete</button>
                                </form>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

            <?php else: // EDITING ORG MODE ?>
                <a href="<?php echo admin_url('admin.php?page=cricket-core-manager'); ?>" class="page-title-action">← Back to List</a>
                <hr class="wp-header-end">
                <div style="display:flex; gap:20px;">
                    <div style="flex:1;">
                        <div class="cc-admin-card">
                            <h2>Edit: <?php echo esc_html($editing_org['name']); ?></h2>
                            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                                <input type="hidden" name="action" value="cc_save_org">
                                <input type="hidden" name="org_id" value="<?php echo esc_attr($editing_org['id']); ?>">
                                <?php wp_nonce_field('cc_org_action'); ?>
                                <table class="form-table">
                                    <tr><th>Name</th><td><input type="text" name="org_name" value="<?php echo esc_attr($editing_org['name']); ?>" class="large-text" required></td></tr>
                                    <tr><th>Type</th><td><select name="org_type"><option value="CLUB" <?php selected($editing_org['type'], 'CLUB'); ?>>Club</option><option value="GOVERNING_BODY" <?php selected($editing_org['type'], 'GOVERNING_BODY'); ?>>Governing Body</option></select></td></tr>
                                    <tr><th>Location</th><td><input type="text" name="org_location" value="<?php echo esc_attr($editing_org['groundLocation'] ?? ''); ?>" class="regular-text"></td></tr>
                                    <tr><th>Country</th><td><input type="text" name="org_country" value="<?php echo esc_attr($editing_org['country'] ?? ''); ?>" class="regular-text"></td></tr>
                                    <tr><th>Logo</th><td><input type="text" name="org_logo" value="<?php echo esc_attr($editing_org['logoUrl'] ?? ''); ?>" class="regular-text cc-image-input"><button class="button cc-upload-btn">Upload</button></td></tr>
                                </table>
                                <?php submit_button('Update Details'); ?>
                            </form>
                        </div>
                    </div>
                    <div style="flex:1;">
                        <div class="cc-admin-card">
                            <h2>Squads</h2>
                            <div style="background:#f0f0f1; padding:15px; border-radius:4px; margin-bottom:20px;">
                                <h4>Add New Squad</h4>
                                <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                                    <input type="hidden" name="action" value="cc_save_team">
                                    <input type="hidden" name="org_id" value="<?php echo esc_attr($editing_org['id']); ?>">
                                    <?php wp_nonce_field('cc_team_action'); ?>
                                    <p><input type="text" name="team_name" placeholder="Team Name" style="width:100%" required></p>
                                    <p style="display:flex; gap:10px;"><input type="text" name="team_location" placeholder="Home Ground" style="flex:1"><input type="text" name="team_logo" placeholder="Logo URL" class="cc-image-input" style="flex:1"><button class="button cc-upload-btn">Img</button></p>
                                    <button class="button button-primary">Add Squad</button>
                                </form>
                            </div>
                            <div class="cc-teams-list">
                                <?php if(empty($editing_org['memberTeams'])): ?><p>No squads added yet.</p><?php else: ?>
                                    <?php foreach($editing_org['memberTeams'] as $team): ?>
                                        <div class="cc-team-item">
                                            <img src="<?php echo esc_url(!empty($team['logoUrl']) ? $team['logoUrl'] : 'https://ui-avatars.com/api/?name='.$team['name']); ?>" class="cc-image-preview">
                                            <div style="flex:1;"><strong><?php echo esc_html($team['name']); ?></strong><br><span style="font-size:11px; color:#666;"><?php echo esc_html($team['location'] ?? 'No loc'); ?></span></div>
                                            <div style="text-align:right;">
                                                <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" style="display:inline;">
                                                    <input type="hidden" name="action" value="cc_delete_team">
                                                    <input type="hidden" name="org_id" value="<?php echo esc_attr($editing_org['id']); ?>">
                                                    <input type="hidden" name="team_id" value="<?php echo esc_attr($team['id']); ?>">
                                                    <?php wp_nonce_field('cc_team_action'); ?>
                                                    <button class="button-link-delete" onclick="return confirm('Delete squad?');">✕</button>
                                                </form>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }
}
new CricketCoreBridge();

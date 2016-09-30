<!doctype html>
<html lang="en">
    <head>
        <title>Lettuce</title>
        <base href="/lettuce/">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="vendor/fontawesome/v4.3.0/css/font-awesome.min.css">
        <link rel="stylesheet" href="vendor/bootstrap/v3.3.0/css/bootstrap.css"/>
        <link rel="stylesheet" href="assets/css/main.css"/>
        <link rel="stylesheet" href="assets/css/bootstrap-theme.css"/>
        <link rel="stylesheet" href="assets/css/transition.css"/>
        <link rel="icon" type="image/png" href="assets/img/logo-icon16.png">
    </head>
    <body>
    <div id="fb-root"></div>
        <div class="content">
            <div ui-view="navbar"></div>
            <div style="margin-top: 50px;" ui-view="content">Loading...</div>
        </div>

        <script src="vendor/angularjs/v1.3.0/angular.js"></script>
        <script src="vendor/angularjs/v1.3.0/angular-animate.js"></script>
        <script src="vendor/angularjs/v1.3.0/angular-cookies.js"></script>
        <script src="vendor/angularjs/v1.3.0/angular-messages.js"></script>
        <script src="vendor/angularjs/v1.3.0/angular-touch.js"></script>

        <script type="text/javascript" src="assets/js/polyfill.js"></script>
        <script src="vendor/ocLazyLoad/v0.5.2/ocLazyLoad.js"></script>
        <script src="vendor/angular-translate/v2.4.2/angular-translate.js"></script>
        <script src="vendor/angular-translate/v2.4.2/angular-translate-loader-partial.js"></script>
        <script src="vendor/ui-router/v0.2.10/ui-router.js"></script>
        <script src="vendor/ui-bootstrap/v0.11.2/ui-bootstrap-tpls.js"></script>
        <script src="app/app.js"></script>

        <script>
            angular.element(document).ready(function() {
                angular.bootstrap(document, ['Lettuce']);
            });
        </script>
    </body>
</html>
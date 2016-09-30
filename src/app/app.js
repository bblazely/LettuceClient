(function (w, ng, mobile) {
    "use strict";

    ng.module('Lettuce', [
        'ngCookies', 'ngAnimate', 'ngTouch', 'ngMessages',
        'ui.bootstrap', 'ui.router',
        'pascalprecht.translate',
        'oc.lazyLoad'
    ], null)
        .config([
            '$stateProvider',
            '$locationProvider',
            '$urlRouterProvider',
            '$translateProvider',
            '$ocLazyLoadProvider',
            function ($stateProvider, $locationProvider, $urlRouterProvider, $translateProvider, $lazy) {
                $lazy.config({
                    loadedModules: ['Lettuce'],
                    debug: false,
                    events: false
                });

                $translateProvider.preferredLanguage('en-GB');
                $translateProvider.fallbackLanguage('en-GB');
                $translateProvider.useLoader('$translatePartialLoader', {
                    urlTemplate: 'components/{part}/lang/{part}.{lang}.lang.json'
                });

                // Convert all routable paths to lowercase and remove trailing slashes.
                $urlRouterProvider.rule(function ($injector, $location) {
                    var path = $location.path();
                    if ( (path[path.length-1] === '/')) {
                        path = path.substr(0, path.length - 1);
                    }
                    $location.replace().path(path.toLowerCase());
                });

                // State definition
                $stateProvider
                    .state('root', {
                        url: '/',
                        resolve: {
                            Common: ['$ocLazyLoad', function ($lazy) {
                                return $lazy.load([{
                                    name: 'Widget.FormExtended',
                                    files: ['components/Widgets/FormExtended/FormExtended.js']
                                }, {
                                    files: ['components/Common/fragments/Common.HelpText.tpl.html']
                                }]);
                            }],
                            NavigationView: ['$ocLazyLoad', function ($lazy) {
                                return $lazy.load([{
                                    name: 'Navigation.View',
                                    files: ['app/Navigation/Navigation.View.js']
                                }]);
                            }]
                        },
                        views: {
                            'navbar@': {
                                controller: 'Navigation.View',
                                templateUrl: 'app/Navigation/Navigation.tpl.html'
                            },
                            'content@': {
                                templateUrl: 'app/Root/Root.tpl.html'
                            }
                        }
                    })

                    .state('root.sandpit', {
                        url: 'sandpit',
                        resolve: {
                            SandPitView: ['$ocLazyLoad', function ($lazy) {
                                return $lazy.load({
                                    name: 'SandPit.View',
                                    files: ['app/SandPit/SandPit.View.js']
                                });
                            }]
                        },
                        views: {
                            'content@': {
                                controller: 'SandPit.View',
                                templateUrl: 'app/SandPit/SandPit.tpl.html'
                            }
                        }
                    })

                    .state('root.loginexternal', {
                        url: 'loginexternal/:provider_id',
                        resolve: {
                            SocialLoginAuthRequest: ['$ocLazyLoad', function ($lazy) {
                                return $lazy.load({
                                    name: 'LoginExternalAuthRequest',
                                    files: ['components/LoginExternal/LoginExternalAuthRequest.js']
                                });
                            }]
                        },
                        views: {
                            'navbar@': {},
                            'content@': {
                                controller: 'LoginExternalAuthRequest.View'
                            }
                        }
                    })

                    .state('root.about', {
                        url: 'about',
                        resolve: {
                            AboutView: ['$ocLazyLoad', function ($lazy) {
                                return $lazy.load({
                                    name: 'About.View',
                                    files: ['app/About/About.View.js']
                                });
                            }]
                        },
                        views: {
                            'content@': {
                                controller: 'About.View',
                                templateUrl: 'app/About/About.tpl.html'
                            }
                        }
                    })

                    .state('root.entity', {
                        url: ':public_id',
                        resolve: {
                            EntityView: ['$ocLazyLoad', function ($lazy) {
                                return $lazy.load({
                                    name: 'Entity.View',
                                    files: ['app/Entity/Entity.View.js']
                                });
                            }]
                        },
                        views: {
                            'content@': {
                                controller: 'Entity.View',
                                templateUrl: 'app/Entity/Entity.View.tpl.html'
                            }
                        }
                    })

                    .state('root.login', {
                        url: 'login',
                        resolve: {
                            LoginView: ['$ocLazyLoad', function ($lazy) {
                                var lvl = $lazy.load({
                                    name: 'Login.View',
                                    files: ['app/Login/Login.View.js']
                                });

                                lvl.then(function() {
                                    console.log('=== LOGIN VIEW COMPLETE ===');
                                });

                                return lvl;
                            }]
                        },
                        views: {
                            'content@': {
                                controller: 'Login.View',
                                templateUrl: 'app/Login/Login.tpl.html'
                            }
                        }
                    });

                // Set a default path
                if (mobile) {
                    $urlRouterProvider.otherwise('#');
                } else {
                    $locationProvider.html5Mode(true);
                    $urlRouterProvider.otherwise('/');
                }
            }])

        // App Bootstrap
        .run([
            '$rootScope',
            '$state',
            '$stateParams',
            '$translate',
            '$translatePartialLoader',
            function ($rootScope, $state, $stateParams, $translate, $translatePartialLoader) {

                console.log('App Started');

                $translatePartialLoader.addPart('Common');
                $translate.refresh();

                // Global variable storage (app wide)
                $rootScope.global = {};
                $rootScope.$state = $state;
                $rootScope.$stateParams = $stateParams;
                $rootScope.$environment = mobile;

                if (mobile) {
                    if (w.plugin.notification.local) {
                        w.plugin.notification.local.add({
                            message: 'Lettuce loaded fine!'
                        });
                    } else {
                        alert('local notifications missing!');
                    }
                }
            }
        ]);
}(window, window.angular, window.cordova));
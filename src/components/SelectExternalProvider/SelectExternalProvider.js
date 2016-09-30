(function (ng) {
    'use strict';
    ng.module('SelectExternalProvider', [{
        name: 'API',
        files: ['components/API/API.js']
    },{
        files: [
            'components/SelectExternalProvider/css/SelectExternalProvider.css',
            'components/SelectExternalProvider/css/SelectExternalProvider.anim.css'
        ]
    }], null)
        .service('SelectExternalProvider.Service', [
            '$api',
            '$q',
            function ($api, $q) {
                var networks = null;

                return {
                    get: function () {
                        if (networks === null) {
                            networks = $q.defer();
                            $api.v1.get('external_provider/list').
                                success(function (data) {
                                    networks.resolve(data);
                                });
                        }
                        return networks.promise;
                    }
                };
            }
        ])

        /* Attributes
            databindings:
                selected
                networks
                disabled
            attr:
                noDeselect
                multiple
         */

        .directive('selectExternalProvider', [
            'SelectExternalProvider.Service',
            function (provider_list) {
                return {
                    restrict: 'AE',
                    scope: {
                        selected:   '=',
                        providers:   '=?',
                        disabled:   '=?'
                    },
                    templateUrl: 'components/SelectExternalProvider/fragments/SelectExternalProvider.tpl.html',
                    link: function (scope, element, attrs) {
                        // Private

                        var str_provider_id = 'provider_id',

                        deselect = function(provider) {
                            scope.selected[provider[str_provider_id]] = false;
                        };

                        if (scope.providers === undefined) {
                            scope.providers = {};
                        }

                        if (scope.disabled === undefined) {
                            scope.disabled = {};
                        }

                        provider_list.get().then(
                            function(data) {
                                ng.forEach(data, function(provider) {
                                    scope.providers[provider[str_provider_id]] = provider;
                                });
                            }
                        );

                        // Scope

                        scope.isDisabled = function(provider) {
                            return scope.disabled[provider[str_provider_id]] === true;
                        };

                        scope.setDisabled = function(p_id, disabled) {
                            scope.disabled[p_id] = disabled;
                        };

                        scope.disableAll = function(excluded) {
                            ng.forEach(scope.providers, function (provider) {
                                if (excluded.indexOf(provider[str_provider_id]) !== -1 ) {
                                    scope.setDisabled(provider[str_provider_id], true);
                                }
                            });
                        };

                        scope.enableAll = function(excluded) {
                            ng.forEach(scope.providers, function (provider) {
                                if (excluded.indexOf(provider[str_provider_id]) !== -1 ) {
                                    scope.setDisabled(provider[str_provider_id], false);
                                }
                            });
                        };

                        scope.isSelected = function(provider) {
                            return (scope.selected[provider[str_provider_id]] === true) ? 'selected' : false;
                        };

                        scope.get = function(id) {
                            return scope.providers[id];
                        };

                        scope.select = function (provider) {
                            if (attrs.multiple) {
                                ng.forEach(scope.providers, function (p) {
                                    if (p[str_provider_id] !== provider[str_provider_id]) {
                                        deselect(p);
                                    } else {
                                        if (scope.isSelected(p) && attrs.noDeselect === undefined) {
                                            deselect(p);
                                        } else {
                                            scope.selected[p[str_provider_id]] = true;
                                        }
                                    }
                                });
                            } else {
                                if (scope.isSelected(provider) !== false && attrs.noDeselect === undefined) {
                                    deselect(provider);
                                } else {
                                    scope.selected[provider[str_provider_id]] = true;
                                }
                            }
                        };
                    }
                };
            }
        ]);
}(window.angular));
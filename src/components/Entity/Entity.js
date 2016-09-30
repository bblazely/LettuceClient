(function (w, ng) {
    'use strict';
    ng.module('Entity', [{
        name: 'API',
        files: ['components/API/API.js']
    }, {
        name: 'UserSession',
        files: ['components/UserSession/UserSession.js']
    },{
        files: ['components/Entity/css/EntityPlate.css']
    }], null)
        .constant('Entity.Event', {
            EVENT_CLICK: 'click'
        })
        .constant('Entity.Constant', {
            OP: {
                ADD: 'a',
                REMOVE: 'r'
            },
            ASSOCIATION: {
                OWNS: 11,
                OWNED_BY: 12,
                LINKED_TO: 21,
                LINKED_FROM: 22,
                REQUIRES: 31,
                REQUIRED_BY: 32,
                GHOSTED_BY: 301,
                GHOSTS: 302,
                HAS_MEMBER: 201,
                MEMBER_OF: 202,
                HAS_GHOST_MEMBER: 203,
                GHOST_MEMBER_OF: 204,
                HAS_SUB_GROUP: 205,
                SUB_GROUP_OF: 206,
                INVITES_MEMBER: 207,
                INVITED_AS_MEMBER: 208,
                HAS_VIEWER: 209,
                CAN_VIEW: 210,
                INVITES_VIEWER: 211,
                INVITED_AS_VIEWER: 212,
                HAS_NATIVE_LOGIN: 501,
                NATIVE_LOGIN_FOR: 502,
                HAS_SOCIAL_LOGIN: 601,
                SOCIAL_LOGIN_FOR: 602,
                HAS_PUBLIC_RECORD: 401,
                PUBLIC_RECORD_FOR: 402,
                ISSUED: 801,
                ISSUED_BY: 802,
                ISSUED_FOR: 803,
                WAITING_ON: 804,
                ISSUED_TO: 805,
                HAS_PENDING: 806,
                HAS_MESSAGE: 701,
                MSG__RECIPIENT_OF: 755
            },
            SCHEMA: {
                USER:   100,
                GROUP:  200,
                GHOST:  300
            },
            PERMISSION: {
                COMMON: {
                    OWNER:          0,
                    DELETE:         1,
                    EDIT:           2,
                    VIEW:           3
                },
                USER: {
                    VIEW_NAME:      100,
                    VIEW_GROUPS:    101             // ALL DEPRECATED???
                },
                GROUP: {
                    MEMBER_APPROVE: 200,
                    MEMBER_REMOVE:  201,
                    MEMBER_VIEW:    202
                }
            }

        })
        .service('Entity.Service', [
            '$api',
            '$q',
            'UserSession.Service',
            'Entity.Constant',
            function ($api, $q, user_session, C_ENTITY) {

                function get(mixed_id) {
                    var entity = $q.defer();
                    $api.v1.get('entity/' + mixed_id)
                        .success(function (data) {
                            entity.resolve(data[mixed_id]);
                        })
                        .error(function (data) {
                            entity.reject(data);
                        });

                    return entity.promise;
                }

                function get_permissions(entity_id) {
                    var permissionsPromise = $q.defer();

                    user_session.get().then(function(session) {
                        $api.v1.get('entity/permission/' + entity_id)
                            .success(function (permission) {
                                permissionsPromise.resolve({
                                    p: permission,
                                    get: function() {
                                        return this.p;
                                    },
                                    has: function(perm) {
                                        if (this.p.indexOf(C_ENTITY.PERMISSION.COMMON.OWNER) !== -1) {
                                            return true;
                                        }
                                        return this.p.indexOf(perm) !== -1;
                                    }
                                });
                            })
                            .error(function (data) {
                                permissionsPromise.reject(data);
                            });
                    });

                    return permissionsPromise.promise;
                }

                return {
                    get: get,
                    permissions: get_permissions
                };
            }
        ]).
        directive('entityPlate', [
            '$state',
            'Entity.Event',
            function ($state, E_ENTITY) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/Entity/fragments/EntityPlate.tpl.html',
                    scope: {
                        entity: '=entityPlate'
                    },
                    controller: ['$scope', '$api', function($scope, $api) {
                        $api.v1.rtu_register($scope.entity.entity_id, null, $scope.entity.time_updated, null, null, function () {
                            console.log('I feel like I have changed somehow...');
                            $scope.entity.display_name = 'ERMAGHERD, POWER OVERWHELMING!';
                        }, $scope);

                    }]
                }
            }
        ])
}(window, window.angular));
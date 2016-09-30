(function (w, ng) {
    'use strict';
    ng.module('EntityGroup', [{
            name: 'Entity',
            files: ['components/Entity/Entity.js']
        },{
            name: 'Widget.LoadingOverlay',
            files: ['components/Widgets/LoadingOverlay/LoadingOverlay.js']
        },{
            name: 'SimpleState',
            files: ['components/Utils/SimpleState/SimpleState.js']
        },{
            name: 'API',
            files: ['components/API/API.js']
        },{
            name: 'Facebook',
            files: ['components/Facebook/Facebook.js']
        },{
            files: [
                'components/EntityGroup/css/EntityGroup.css',
                'components/EntityGroup/css/EntityGroupMemberList.css'
            ]
        }], null)

        .service('EntityGroup.Service', [
            '$api',
            '$q',
            'Entity.Service',
            'Entity.Constant',
            function ($api, $q, entity, C_ENTITY) {

                function member(entity_id, member_id) {
                    var q = $q.defer();
                    $api.v1.get('group/member/' + entity_id + '/' + ((member_id) ? member_id : ''))
                        .success(function (data) {
                            q.resolve(data);
                        })
                        .error(function (data) {
                            q.reject(data);
                        });

                    return q.promise;
                }

                return {
                    member: member
                };
            }
        ])
        .directive('entityGroup', [
            '$rootScope',
            '$translate',
            '$translatePartialLoader',
            '$api',
            '$modal',
            '$stateParams',
            'Entity.Service',
            'Entity.Constant',
            'EntityGroup.Event',
            function ($rootScope, $translate, $translatePartialLoader, $api, $modal, $stateParams, entity, C_ENTITY, E_ENTITY_GROUP) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/EntityGroup/fragments/EntityGroupTopLevel.tpl.html',
                    scope: {
                        entity_data: '=entityGroup'
                    },
                    link: function (scope, element, attr, form) {
                        scope.PERMISSION = C_ENTITY.PERMISSION;

                        // Init: Grab initial permissions
                        entity.permissions(scope.entity_data.entity_id).then(function(perm) {
                            scope.perm = perm;
                        });

                        // Incomplete, was being used for testing purposes
                        $api.v1.rtu_register(scope.entity_data.entity_id, null, scope.entity_data.time_updated, null, null, function () {
                            console.log('group entity changed?');
                            entity.get(scope.entity_data.entity_id).then(function(data) {
                                scope.entity_data.display_name = data.display_name;
                            })
                        }, scope);


                        scope.inviteCallback = function(data) {
                            console.log('callback!', data);
                            $api.v1.post('request/invite', {
                                to_entity_id:       data.entity_id,
                                for_entity_id:      scope.entity_data.entity_id,
                                socialnetwork:     data.meta
                            }).error(function (data, status, headers) {
                                if (status === 409) {
                                    // TODO: Placeholder. Replace with styled $modal popup_content (new directive?)
                                    // And load the entity into the group list if it's not already there.

                                    alert('User is already a member of your group');

                                } else {
                                    alert('User invite failed.');
                                }
                            });

                        };

                        // Trigger permission load on session change
                       /* $rootScope.$on(E_USER_SESSION.EVENT_CHANGE_STATE, function(e, action) {
                            switch (action) {
                                case E_USER_SESSION.ACTION_START:
                                    entity.permissions($stateParams.public_id, C_ENTITY.TYPE.USER).then(function(perm) {
                                        scope.perm = perm;
                                    });
                                    break;
                                case E_USER_SESSION.ACTION_END:
                                    scope.perm = null;
                                    break;
                            }
                        });*/
                    }
                };
            }
        ])

        .directive('entityGroupMemberList', [
            '$translate',
            '$translatePartialLoader',
            '$api',
            '$state',
            '$rootScope',
            'Entity.Service',
            'EntityGroup.Service',
            'SimpleState.Service',
            'Entity.Constant',
            'SimpleState.Constant',
            'EntityGroup.Event',
            'API.Event',
            function ($translate, $translatePartialLoader, $api, $state, $rootScope, entity, entity_group, simple_state, C_ENTITY, C_SIMPLE_STATE, E_ENTITY_GROUP, E_API) {
                return {
                    restrict: 'AE',
                    templateUrl: 'components/EntityGroup/fragments/EntityGroupMemberList.tpl.html',
                    link: function (scope, element, attr, form) {
                        var group_id = parseInt(attr.entityGroupMemberList, 10), last_update_time = 0;

                        // Private
                        $translatePartialLoader.addPart('EntityGroup');
                        $translate.refresh();
                        scope.members = [];

                        entity_group.member(group_id).then(function(data) {
                            ng.forEach(data, function(member) {
                                scope.members.push(member);
                            });
                        });

                        // TODO: Investigate doing it this way

                        $api.v1.rtu_register(group_id, C_ENTITY.ASSOCIATION.HAS_GHOST_MEMBER, 0,
                            // RTU: Group ADD a Ghost Member
                            function (entity_id, request, changeset) {
                                if (scope.members.filterObjectKeys('entity_id', entity_id).length === 0) {
                                    if (request && request[entity_id]) {
                                        scope.members.push(request[entity_id]);
                                    } else {
                                        entity_group.member(group_id, entity_id).then(function (new_member) {
                                            scope.members.push(new_member[entity_id]);
                                        });
                                    }
                                }
                            },
                            // RTU: Group REMOVE a Ghost Member
                            function (entity_id, request, changeset) {
                                console.error('NYI');
                            },
                            null,
                            scope
                        );

                        $api.v1.rtu_register(
                            group_id,
                            C_ENTITY.ASSOCIATION.HAS_MEMBER,
                            last_update_time,
                            // Add Member
                            function (entity_id, request, changeset) {
                                var member = scope.members.filterObjectKeys('ghosts_id', entity_id);
                                if (member.length !== 0) {
                                    entity_group.member(group_id, member.entity_id).then(function(new_member) {
                                        ng.forEach(scope.members, function(d, i) {                  // TODO this feels clumsy, can it be done 'better'
                                            if (d.ghosts_id == entity_id) {
                                                scope.members[i] = new_member[d.entity_id];
                                            }
                                        });
                                    });
                                }
                            },
                            null,
                            null,
                            scope
                        );

                        $api.v1.rtu_register(group_id, C_ENTITY.ASSOCIATION.INVITES_MEMBER,
                            0,
                            null,
                            // Remove Member Invite
                            function (entity_id, request, changeset) {
                                var member = scope.members.filterObjectKeys('ghosts_id', entity_id);
                                if (member.length !== 0) {
                                    member[0].pending = 0;
                                }
                            },
                            null,
                            scope
                        );
                    }
                };
            }
        ])
        .directive('entityGroupMemberInvite', [
            '$translate',
            '$translatePartialLoader',
            '$api',
            '$state',
            '$rootScope',
            'SimpleState.Service',
            'SimpleState.Constant',
            'Entity.Constant',
            'EntityGroup.Event',
            function ($translate, $translatePartialLoader, $api, $state, $rootScope, simple_state, C_SIMPLE_STATE, C_ENTITY, E_ENTITY_GROUP) {
                return {
                    restrict: 'AE',
                    require: 'form',
                    templateUrl: 'components/EntityGroup/fragments/EntityGroupMemberInvite.tpl.html',
                    link: function (scope, element, attr, form) {
                        // Private
                        var group_id = attr.entityGroupMemberInvite;

                        $translatePartialLoader.addPart('EntityGroup');
                        $translate.refresh();

                        scope.state = simple_state.get();
                        scope.STATE = C_SIMPLE_STATE.STATE;
                        scope.form = form;

                        scope.doGroupMemberInvite = function () {
                            if (form.$valid) {
                                scope.state.change(C_SIMPLE_STATE.STATE.PENDING);
                                $api.v1.post('entity', {
                                    display_name:       scope.data.display_name,
                                    assoc_entity_id:    group_id,
                                    schema_id:          C_ENTITY.SCHEMA.GHOST
                                }).success(function () {
                                    scope.data.display_name = null;
                                    scope.state.change(C_SIMPLE_STATE.STATE.IDLE);
                                }).error(function (data, status, headers) {
                                    /*switch (headers()[ERROR_CODE]) {
                                     // Add error handling here for reserved word conflict
                                     }*/
                                });
                            }
                        };
                    }
                };
            }
        ])
        .directive('entityGroupCreate', [
            '$rootScope',
            '$translate',
            '$translatePartialLoader',
            '$api',
            '$state',
            'SimpleState.Service',
            'SimpleState.Constant',
            'Entity.Constant',
            'EntityGroup.Event',
            'API.Event',
            function ($rootScope, $translate, $translatePartialLoader, $api, $state, simple_state, C_SIMPLE_STATE, C_ENTITY, E_ENTITY_GROUP, E_API) {
                return {
                    restrict: 'AE',
                    require: 'form',
                    templateUrl: 'components/EntityGroup/fragments/EntityGroupCreate.tpl.html',
                    link: function (scope, element, attr, form) {
                        // Private
                        $translatePartialLoader.addPart('EntityGroup');
                        $translate.refresh();

                        scope.state = simple_state.get();
                        scope.STATE = C_SIMPLE_STATE.STATE;
                        scope.form = form;

                        scope.doGroupCreate = function () {
                            if (form.$valid) {
                                scope.state.change(C_SIMPLE_STATE.STATE.PENDING);
                                $api.v1.post('entity', {
                                    display_name: scope.data.display_name,
                                    schema_id: C_ENTITY.SCHEMA.GROUP
                                }).success(function (data) {
                                    if (attr.createGroup === 'true') {
                                        $state.go('root.entity', {public_id: data.public_id});
                                    } else {
//                                        $rootScope.$emit(E_ENTITY_GROUP.EVENT_GROUP, E_ENTITY_GROUP.ACTION_GROUP_CREATED, data);
                                        scope.data.display_name = null;
                                    }
                                    scope.state.change(C_SIMPLE_STATE.STATE.IDLE);
                                }).error(function (data, status, headers) {
                                    /*switch (headers()[ERROR_CODE]) {
                                        // Add error handling here for reserved word conflict
                                    }*/
                                });
                            }
                        };
                    }
                };
            }
        ]).
        constant('EntityGroup.Event', {
            EVENT_MEMBER_CHANGE:    'EntityGroup.MemberChange',
            ACTION_MEMBER_INVITED:  1,
            ACTION_MEMBER_REMOVED:  2,

            EVENT_GROUP:            'EntityGroup',
            ACTION_GROUP_CREATED:   1,
            ACTION_GROUP_DELETED:   2
        });
}(window, window.angular));
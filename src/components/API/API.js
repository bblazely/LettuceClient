(function (w, ng) {
    'use strict';

    ng.module('API', [{
        name: 'MessageOverlay',
        files: ['components/Widgets/MessageOverlay/MessageOverlay.js']
    }], null)
        .config(['$httpProvider', function ($httpProvider) {
            $httpProvider.defaults.useXDomain = true; //Enable cross domain calls
        }])
        .service('$api', [
            '$http',
            '$q',
            '$rootScope',
            '$timeout',
            '$translate',
            '$translatePartialLoader',
            'MessageOverlay.Service',
            'Entity.Constant',
            'API.Event',
            function ($http, $q, $rootScope, $timeout, $translate, $translatePartialLoader, message_overlay, C_ENTITY, E_API) {

                var api_v1_path = 'https://localhost/lettuce/v1/',
                    watching = false,
                    watcher_id = null,
                    watcher_seq = 0,
                    watcher_count = {},
                    watcher_change = {},
                    watcher_overlay_id = null,
                    watcher_offline = false,
                    watcher_last_delta = 0,
                    watcher_delay = null,       // Watcher HTTP Delay - Promise to make the http request wait for a bit before opening a connection (to pool requests better)
                    watcher_timeout = null,     // Watcher HTTP Timeout - Promise to ensure the request is cancelled after 30 seconds of waiting
                    watcher_cancel = null;      // Watcher Force Promise - Promise to trigger the timeout attr on the http request to force the request to end.

                // Language
                $translatePartialLoader.addPart('API');
                $translate.refresh();

                function emit_changeset(c, r, t) {
                    ng.forEach(c, function (changeset, entity_id) {
                        $rootScope.$emit(
                            E_API.EVENT_UPDATE_TRIGGER,
                            parseInt(entity_id, 10),
                            changeset['l'] ? changeset['l'] : null,
                            changeset['e'] ? changeset['e'] : false,
                            r, c, t
                        );
                    });
                }

                function cancel_watch() {
                    $timeout.cancel(watcher_timeout);   // Kill the open connection
                    $timeout.cancel(watcher_delay);     // Stop the current pending request

                    if (watcher_cancel) {
                        watcher_cancel.resolve();
                        watcher_cancel = null;
                    }

                    watching = false;
                }

                function rebuild_watch() {
                    var parts;
                    ng.forEach(watcher_count, function (count, watch) {
                        if (count > 0) {
                            parts = watch.split('.');
                            add_watch(parts[0], (parts[1]) ? parseInt(parts[1], 10) : null, true)
                        }
                    });
                    watch();
                }

                function handle_status(status) {
                    switch (status) {
                        case 204:
                            cancel_watch();
                            console.warn('RTU::Nothing to watch. RTU Disabled.');
                            if (Object.keys(watcher_count).length > 0) {
                                console.error('RTU::Watch List Mismatch. Rebuilding.', watcher_count);
                                rebuild_watch();
                            }
                            break;
                        case 401:
                            console.warn('RTU::Logout Detected. RTU Disabled.');
                            $rootScope.$emit(E_API.EVENT_LOGOUT_DETECTED);
                            break;
                    }
                }

                function watch() {
                    cancel_watch(); // Only allow one watch call at once
                    watcher_delay = $timeout(function () {
                        var http_post_data;

                        if (Object.keys(watcher_change).length != 0) {
                            console.info('RTU::Watch List Change Detected...');
                            http_post_data = {watch: watcher_change};
                        }

                        watcher_seq = (watcher_seq + 1) % 9999;
                        watcher_cancel = $q.defer();
                        $http({
                            method: (http_post_data) ? 'POST' : 'GET',
                            url: api_v1_path + 'rtu/' + (watcher_id ? watcher_id + '/' + watcher_last_delta + "/" + watcher_seq : ''),
                            data: http_post_data,
                            timeout: watcher_cancel.promise
                        })
                            .success(function (data, status) {
                                // Remove watcher error if present
                                if (watcher_offline === true) {
                                    console.info("RTU::The Watcher is online.");
                                    watcher_offline = false;
                                    message_overlay.remove(watcher_overlay_id);
                                    message_overlay.add('ERROR_RTU_AVAILABLE', 'success', 5000);
                                }

                                // Handle Status
                                if (status == 204) {
                                    handle_status(status);
                                } else {
                                    if (data.k) {
                                        watcher_seq = 0;
                                        watcher_id = data.k;
                                    }

                                    if (data.c) {
                                        emit_changeset(data.c, null);
                                    }

                                    if (data.t && data.t != watcher_last_delta) {
                                        watcher_seq = 0;
                                        watcher_last_delta = data.t;
                                    }
                                    watch();
                                }

                                $timeout.cancel(watcher_timeout);
                            })
                            .error(function (data, status) {
                                if (status !== 0) {     // Wasn't cancelled
                                    // Show an error
                                    if (watcher_offline === false) {
                                        console.error('RTU::The Watcher is offline.');
                                        watcher_offline = true;
                                        watcher_overlay_id = message_overlay.add('ERROR_RTU_UNAVAILABLE');
                                    }

                                    if (status === 401) {
                                        watcher_seq = 0;
                                        handle_status(status);
                                    } else {
                                        watcher_timeout = $timeout(function () {
                                            console.warn('RTU::ErrorRetry');
                                            watch();
                                        }, 30000);
                                    }
                                } else {
                                    console.log('RTU::Cancellation Detected(A)', status);
                                }
                            })
                            .finally(function () {
                                $timeout.cancel(watcher_timeout);
                            });

                        watcher_change = {};

                        // Force reconnection after 65 seconds (server should abort at 60s)
                        watcher_timeout = $timeout(function () {
                            console.error('RTU::Timeout');
                            watch();
                        }, 65000);
                    }, 1000);
                }

                function add_watch(entity_id, assoc_id, ignore_counters, last_updated) {
                    var key, p;

                    if (!assoc_id) {
                        // It's an entity watch
                        if (watcher_count[entity_id]) {
                            watcher_count[entity_id] += 1;
                        } else {
                            watcher_count[entity_id] = 1;

                            if (!watcher_change.e) {
                                watcher_change.e = {a: {}};
                            } else {
                                if (!watcher_change.e.a) {
                                    watcher_change.e.a = {};
                                }
                            }
                            watcher_change.e.a[entity_id] = last_updated;
                        }
                    } else {
                        // It's an association list watcher
                        key = entity_id + '.' + assoc_id;
                        if (watcher_count[key] && !ignore_counters) {
                            watcher_count[key] += 1;
                        } else {
                            if (!ignore_counters) {
                                watcher_count[key] = 1;
                            }

                            if (!watcher_change.l) {
                                watcher_change.l = {};
                            }

                            if (!watcher_change.l[entity_id]) { // Create the watcher assoc list op entry
                                watcher_change.l[entity_id] = {a: {}};
                            } else if (watcher_change.l[entity_id].r) {
                                // Remova an existing removal if there is one
                                p = watcher_change.l[entity_id].r.indexOf(assoc_id);
                                if (p !== -1) {
                                    watcher_change.l[entity_id].r.splice(p, 1);
                                }
                            }

                            // Add the watcher
                            if (!watcher_change.l[entity_id].a) {
                                watcher_change.l[entity_id].a = {};
                            }
                            watcher_change.l[entity_id].a[assoc_id] = last_updated;
                        }
                    }
                }

                function remove_watch(entity_id, assoc_id) {
                    var key, p;

                    if (!assoc_id) {
                        // It's an entity watch
                        if (watcher_count[entity_id] > 0) {
                            watcher_count[entity_id] = Math.max(0, watcher_count[entity_id] - 1);

                            if (watcher_count[entity_id] === 0) {
                                delete watcher_count[entity_id];

                                if (!watcher_change.e) {
                                    watcher_change.e = {r: [entity_id]};
                                } else {
                                    // Remove a pending add (if there is one)
                                    if (watcher_change.e.a && watcher_change.e.a[entity_id]) {
                                        delete watcher_change.e.a[entity_id];
                                    }

                                    // Add the removal
                                    if (watcher_change.e.r) {
                                        watcher_change.e.r.push(entity_id);
                                    } else {
                                        watcher_change.e.r = [entity_id];
                                    }
                                }
                            }
                        }
                    } else {
                        // It's an association list watcher
                        key = entity_id + '.' + assoc_id;
                        if (watcher_count[key] > 0) {
                            watcher_count[key] = Math.max(0, watcher_count[key] - 1);

                            if (watcher_count[key] === 0) {
                                delete watcher_count[key];

                                if (!watcher_change.l) {
                                    watcher_change.l = {};
                                }

                                if (watcher_change.l[entity_id]) {
                                    // Remove a pending add
                                    if (watcher_change.l[entity_id].a && watcher_change.l[entity_id].a[assoc_id]) {
                                        delete watcher_change.l[entity_id].a[assoc_id];
                                    }

                                    // Push the removal
                                    if (watcher_change.l[entity_id].r) {
                                        watcher_change.l[entity_id].r.push(assoc_id);
                                    } else {
                                        watcher_change.l[entity_id].r = [assoc_id];
                                    }
                                } else {
                                    // Add an initial entry to the structure
                                    watcher_change.l[entity_id] = {r: [assoc_id]};
                                }
                            }
                        }

                    }
                }

                // Todo: allow watch_assoc_id to be null if watching an entity
                function rtu_register_counter(watch_entity_id, watch_assoc_id, onChange, source_scope) {
                    //   var event_off =
                }

                function rtu_register(watch_entity_id, watch_assoc_id, last_updated, onAssocAdd, onAssocRemove, onEntityChange, source_scope) {
                    var event_off = $rootScope.$on(E_API.EVENT_UPDATE_TRIGGER, function (e, trigger_entity_id, assoc_change_list, entity_changed, request, changeset) {
                        watch_entity_id = parseInt(watch_entity_id, 10);
                        if (watch_entity_id === trigger_entity_id) {         // Does the event relate to this group entity id?

                            // Entity Change Triggered
                            if (entity_changed && onEntityChange) {
                                onEntityChange(entity_changed); // entity_changed is a timestamp
                            }

                            // Process Assoc List Changes
                            ng.forEach(assoc_change_list, function (op_list, assoc_id) {
                                if (parseInt(assoc_id, 10) === watch_assoc_id) {                              // Is this assoc something we're watching?
                                    ng.forEach(op_list, function (assoc_list, op) {                      // Iterate over 'a' and 'r'
                                        if (!ng.isArray(assoc_list)) {
                                            if (ng.isObject(assoc_list)) {
                                                assoc_list = Object.keys(assoc_list);   // Timestamp/ID Hash
                                            } else {
                                                assoc_list = [assoc_list];      // Scalar
                                            }
                                        }

                                        ng.forEach(assoc_list, function (event_entity_id) {                    // Iterate over entities listed for each op
                                            if (!ng.isNumber(event_entity_id)) {
                                                event_entity_id = parseInt(event_entity_id, 10);
                                            }
                                            if (op === C_ENTITY.OP.ADD) {
                                                if (typeof onAssocAdd == 'function') {
                                                    onAssocAdd(event_entity_id, request, changeset);
                                                }
                                            } else if (op === C_ENTITY.OP.REMOVE) {
                                                if (typeof onAssocRemove == 'function') {
                                                    onAssocRemove(event_entity_id, request, changeset);
                                                }
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });

                    add_watch(watch_entity_id, watch_assoc_id, false, last_updated);
                    watch();

                    if (source_scope.$on) {
                        source_scope.$on('$destroy', function () {
                            remove_watch(watch_entity_id, watch_assoc_id);
                            event_off();
                            watch();
                        })
                    } else {
                        console.warn('RTU::Source scope not specified or scope is invalid.', watch_entity_id, watch_assoc_id);
                    }
                }

                function api_call(method, node, params, data, timeout) {
                    var q = $q.defer(),
                        result = $http({
                            method: method,
                            url: api_v1_path + node,
                            params: params,
                            data: data,
                            timeout: timeout
                        }); // Remember, this must be a promise, not a $q. pass $q.promise

                    q.promise.then = function (onFulfilled, onRejected, progressBack) {
                        result.then(function (response) {
                            response.timestamp = response.headers('request-time');
                            if (response.data.r) {
                                response.data = response.data.r;
                            }
                        });
                        return result.then(onFulfilled, onRejected, progressBack);
                    };

                    q.promise.success = function (fn) {
                        result.then(function (response) {
                            response.timestamp = response.headers('request-time');
                            if (response.data.r) {
                                response.data = response.data.r;    // Handle a request that's split between r & c
                            }
                        });
                        return result.success(fn);
                    };

                    q.promise.error = result.error;

                    result.then(function (response) {
                        if (response.data.c) {
                            emit_changeset(response.data.c, response.data.r, response.headers('request-time'));
                        }
                    }, function (response) {
                        if (response.status === 401) {
                            console.warn('RTU::Logout Detected');
                            cancel_watch();
                            $rootScope.$emit(E_API.EVENT_LOGOUT_DETECTED);
                        }
                    });

                    return q.promise;
                }

                return {
                    v1: {
                        // REST Methods
                        post: function (node, data, params, timeout) {
                            return api_call('POST', node, null, data, timeout);
                        },
                        put: function (node, data, timeout) {
                            return api_call('PUT', node, null, data, timeout);
                        },
                        get: function (node, params, timeout) {
                            return api_call('GET', node, params, null, timeout);
                        },
                        'delete': function (node, params, timeout) {
                            return api_call('DELETE', node, params, null, timeout);
                        },

                        // Data Update Watchers
                        rtu_register: rtu_register
                    }
                };
            }
        ])
        .constant('API.Event', {
            EVENT_UPDATE_TRIGGER: 'Event::API.UpdateTrigger',
            EVENT_LOGOUT_DETECTED: 'Event::API.LogoutDetected'
        });
}(window, window.angular));
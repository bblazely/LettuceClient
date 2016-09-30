(function (ng) {
    'use strict';
    ng.module('SimpleState', [], null)
        .constant('SimpleState.Constant', {
            EVENT: {
                STATE_CHANGE:   'onSimpleStateChange'
            },
            STATE: {
                IDLE:       0,
                SUCCESS:    1,
                PENDING:    2
            }
        })
        .service('SimpleState.Service', [
            '$rootScope',
            'SimpleState.Constant',
            function ($rootScope, C_SIMPLE_STATE) {
                var states = {}, id_counter = 0;

                function buildState(id) {
                    return {
                        _id: id,
                        current: null,

                        id: function() {
                            return this._id;
                        },

                        is: function (state) {
                            if (ng.isArray(state)) {
                                for (var i = 0; i < state.length; i = i + 1) {
                                    if (this.is(state[i])) {
                                        return true;
                                    }
                                }
                                return false;
                            }

                            return this.current === state;
                        },

                        change: function (state, callback) {
                            console.log('change state to', state);
                            var oldState = this.current;
                            this.current = state;

                            // Used typically when a controller etc needs to do something on EVERY state change that affects it.
                            $rootScope.$emit(C_SIMPLE_STATE.EVENT.STATE_CHANGE, {id: this._id, newState: state, oldState: oldState});

                            // Used typically when a specific operation needs to run a function after changing state (ie: using state.change() from a view)
                            if (callback) {
                                callback(state, oldState);
                            }
                        }
                    };
                }

                return {
                    remove: function(state) {
                        delete states[state._id];
                    },

                    get: function (initial_state, id) {
                        if (!states[id]) {
                            if (!id) {
                                id = id_counter++;
                            }
                            states[id] = buildState(id);
                        }

                        // Set initial state if it has been specified and current state is null
                        if (states[id].current === null && typeof(initial_state) !== 'undefined') {
                            states[id].current = initial_state;
                        }

                        return states[id];
                    },

                    list: function() {
                        return Object.keys(states);
                    }
                };
            }
        ]);
})(window.angular);
(function (ng) {
    'use strict';
    ng.module('Widget.FormExtended', [])
        .directive('form', [function () {
            return {
                require: 'form',
                restrict: 'E',
                priority: -1000,
                link: function (scope, element, attr, form) {
                    // Revalidate all form fields on form submission (for custom validators)
                    element.on('submit', function () {
                        ng.forEach(form, function(formElement, fieldName) {
                            if (fieldName[0] !== '$') {
                                formElement.$validate();
                            }
                        })
                    });
                }
            }
        }])
        .directive('validateMatch', ['$parse', '$timeout', function ($parse, $timeout) {
            return {
                require: 'ngModel',
                scope: {
                    match: '=validateMatch',
                    enabled: '=?validateMatchEnabled'
                },
                link: function (scope, element, attr, model) {

                    scope.enabled = (scope.enabled === undefined) ? true : scope.enabled;

                    // Validator to catch change on this target field
                    model.$validators.match = function(modelValue, viewValue) {
                        if (scope.match && scope.enabled) {
                            return (viewValue === scope.match);
                        } else {
                            return true;
                        }
                    };

                    // Watch the source field for changes
                    scope.$watch('match', function(newVal, oldVal) {
                       if (newVal !== oldVal) {
                           if (newVal !== model.$viewValue && model.$dirty && scope.enabled) {
                               model.$setValidity('match', false);
                           } else {
                               model.$setValidity('match', true);
                           }
                       }
                    });

                       /*         An attempt to correct chrome auto-fill (can't reproduce now though)

                       var origVal = element.val();
                    console.log(origVal);
                                $timeout(function () {
                                    console.log('timeout');
                                    var newVal = element.val();
                                    if(model.$pristine && origVal !== newVal) {
                                        console.log('set it');
                                        model.$setViewValue(newVal);
                                    }
                                }, 500);*/
                }
            }
        }])
        .directive('input', [function () {
            return {
                require: ['?ngModel', '?^form'],
                link: function ( scope, element, attrs, require ) {
                    var model = require[0] || ng.noop,
                        form = require[1] || ng.noop;

                    // Ensure validation of an input element only occurs if the parent form has been submitted
                    // Or the input element is 'dirty'
                    model.valid = function () {
                        if (model.$dirty || form.$submitted) {
                            return model.$valid;
                        } else {
                            return true;
                        }
                    };
                }
            };
        }]);
}(window.angular));
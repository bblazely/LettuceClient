(function (ng) {
    'use strict';
    ng.module('Widget.CustomValidator', [])
        .directive('customValidator', [function () {
            return {
                restrict: 'A',
                require: 'ngModel',
                scope: { customValidatorFunction: '&' },
                link: function (scope, elm, attr, ngModelCtrl) {
                    ngModelCtrl.$parsers.push(function (value) {
                        var result = scope.customValidatorFunction({ 'value': value });
                        if (result || result === false) {
                            if (result.then) {
                                result.then(function (data) {           //For promise type result object
                                    ngModelCtrl.$setValidity(attr.customValidator, data);
                                }, function (error) {
                                    ngModelCtrl.$setValidity(attr.customValidator, false);
                                });
                            }
                            else {
                                ngModelCtrl.$setValidity(attr.customValidator, result);
                                return result ? value : undefined;      //For boolean result return based on boolean value
                            }
                        }
                        return value;
                    });
                }
            };
        }]);
}(window.angular));
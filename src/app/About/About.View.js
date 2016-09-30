angular.module( 'About.View', [])
    .controller('About.View', [
            // Dependancy Injection
            '$scope',

            // Controller
            function($scope) {
                $scope.HelloWorld = 'Hello World';
            }
        ]
    );
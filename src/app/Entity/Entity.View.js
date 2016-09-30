(function (w, ng) {
    'use strict';
    ng.module('Entity.View', [{
        name: 'Entity',
        files: [
            {path: 'components/Entity/Entity.js', type: 'js'}
        ]
    },{
        name: 'EntityUser',
        files: ['components/EntityUser/EntityUser.js']
    },{
        name: 'EntityGroup',
        files: ['components/EntityGroup/EntityGroup.js']
    }], null)
        .controller('Entity.View', [
            '$scope',
            '$stateParams',
            'Entity.Service',
            'Entity.Constant',
            function ($scope, $stateParams, entity, C_ENTITY) {
                $scope.SCHEMA = C_ENTITY.SCHEMA;
                $scope.entity = {};

                entity.get($stateParams.public_id).then(
                    function success(data) {
                        $scope.entity = data;
                    },
                    function error() {
                        $scope.entity = {type: 'notfound'};
                    }
                );

                $scope.isEntity = function ( schema_id ) {
                    if ($scope.entity && $scope.entity.schema_id === schema_id) {
                        return true;
                    }
                };
            }
        ]);
}(window, window.angular));

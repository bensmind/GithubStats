var mod = angular.module('ghys', [])
mod.value('$user', user);

mod.controller('homeCtrl', ['$scope', '$http', '$user', function($scope, $http, $user){
    $scope.user = $user;
}])

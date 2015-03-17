var githubApi = angular.module('github.api', [])
githubApi.value('$user', user);

githubApi.factory('github.api.user', ['$http','$user', function($http, $user){
    function getUserRepos(callback){
        return $http({method:'GET', url:$user._json.repos_url})
            .then(function(result){
                (callback || angular.noop)(result);
                return result.data;
            });
    }
    function getUserOrgs(callback){
        return $http({method:'GET', url:$user._json.organizations_url})
            .then(function(result){
                (callback || angular.noop)(result);
                return result.data;
            });
    }
    return {
        getUserRepos: getUserRepos,
        getUserOrgs: getUserOrgs
    };
}]);

githubApi.factory('github.api.repo', ['$http', function($http){
    function getOrgRepos(org, callback){
        return $http({method:'GET', url:org.repos_url})
            .then(function(result){
                (callback || angular.noop)(result);
                return result.data;
            });
    }

    function getContributions(repo, callback) {
        return $http({method: 'GET', url: repo.url + '/stats/contributors'})
            .then(function (result) {
                (callback || angular.noop)(result);
                return result.data;
            });
    };

    return {
        getOrgRepos: getOrgRepos,
        getContributions: getContributions
    };
}]);
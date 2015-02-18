Array.prototype.flatten= function(fun){
    if(typeof fun!= 'function') fun= '';
    var A= [], L= this.length, itm;
    for(var i= 0; i<L; i++){
        itm= this[i];
        if(itm!= undefined){
            if(!itm.flatten){
                if(fun) itm= fun(itm);
                if(itm) A.push(itm);
            }
            else A= A.concat(itm.flatten(fun));
        }
    }
    return A;
}

var mod = angular.module('ghys', [ 'tc.chartjs' ])
mod.value('$user', user);

mod.controller('homeCtrl', ['$scope', '$http', '$user', '$q', function($scope, $http, $user, $q){
    $scope.user = $user;
    $scope.user.repos = [];
    $scope.user.orgs = [];

    $scope.chart ={};
    $scope.$watch(function(){
        return $scope.user.repos;
    }, function(newVal){
        if(!newVal || !newVal.length) return;

        var filtered = newVal.filter(function(r){
            return r.contribution;
        }).map(function(f){return f.contribution;});

        var weekRange = d3.extent(filtered.map(function(f){return f.weeks}).flatten(function(f){return f;}), function(ws){
            return ws.w;
        });

        var data = {
            labels:[],
            datasets: [{
                label: "Additions",
                data: []
            },
                {
                    label: "Deletions",
                    data: []
                }]
        };



            var i = weekRange[0];
        while(i < weekRange[1])
        {


                var additions = 0, deletions = 0;

                filtered.forEach(function(r){

                    var week = r.weeks.filter(function(f){
                        return f.w == i;
                    })[0];
                    if(week){
                        additions+=week.a;
                        deletions+=week.d;
                    }
                    data.labels.push(d3.time.format('%x')(new Date(i)));
                    data.datasets[0].data.push(additions);
                    data.datasets[1].data.push(deletions);
                });
            i +=604800000;
        }



        $scope.chart.data =data;
    }, true);

    if($user)
    {
        $http.defaults.headers.common.Authorization = 'Token ' + $user.accessToken;
    }

    var getContributions = function(repos) {
        return repos.map(function (repo) {
            return $http({method: 'GET', url: repo.url + '/stats/contributors'})
                .then(function (result) {
                    updateRateLimit(result.headers);
                    var contribution = result.data.filter(function (contrib) {
                        return contrib.author.login === $user._json.login;
                    })[0];
                    repo.contribution = contribution;
                    return repo;
                })
                .then(addRepos);
            });
    };

    var addRepos = function(repo){
        $scope.user.repos.push(repo);
    };


    function updateRateLimit(headers){
        $scope.rateLimit = headers && headers()['x-ratelimit-remaining'] || $scope.rateLimit || 0;
    }

    $http({method:'GET', url:$user._json.repos_url})
            .then(function(result){
                updateRateLimit(result.headers);
                return result.data;
            })
        .then(getContributions);

    $http({method:'GET', url:$user._json.organizations_url})
        .then(function(result){
            updateRateLimit(result.headers);
            [].push.apply($scope.user.orgs, result.data);
            return result.data;
        })
        .then(function(data){
            return data.map(function(org){
                return $http({method:'GET', url:org.repos_url})
                    .then(function(result){
                        updateRateLimit(result.headers);
                        return result.data;
                    })
                    .then(getContributions);
                });
            });
}]);



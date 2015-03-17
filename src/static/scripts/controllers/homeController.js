
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
Array.prototype.max = function() {
  return Math.max.apply(null, this);
};

Array.prototype.min = function() {
  return Math.min.apply(null, this);
};

var mod = angular.module('ghys', [ 'chart.js', 'github.api' ])
mod.constant('moment', moment)
mod.value('$user', user);

mod.controller('homeCtrl', ['$scope', '$http', '$user', '$q', 'moment', 'github.api.repo', 'github.api.user', function($scope, $http, $user, $q, moment, repoApi, userApi){
    $scope.user = $user;

    if($scope.user.accessToken) {
        //Logged in
        $http.defaults.headers.common.Authorization = 'Token ' + $user.accessToken;
    }
    else{
        return; //Not logged in
    }

    $scope.user.repos = [];
    $scope.user.orgs = [];

    $scope.chart ={
        type:"StackedBar",
        options:{
            responsive:true,
            barStrokeWidth : 1
        },
        labels:[],
        series:['Additions', 'Deletions'],
        data:[],
        colours:['#55a532','#bd2c00'],
        controls:{
            startDate: moment().subtract(3, 'month').toDate(),
            endDate: moment().toDate()
        }
    };

    var utcOffset = moment().utcOffset(); //In minutes

    $scope.$watch('chart.controls', function(newVal){
        if(!newVal || !newVal.startDate || !newVal.endDate)return;

        return pushChartData(newVal.startDate, newVal.endDate)
    }, true);

    var pushChartData = function(startDate, endDate){
        startDate = moment(startDate), endDate = moment(endDate);

        var orgRepos =$scope.user.orgs.map(function(org){
            return org.repos;
        }).flatten();
        var repoContributions = $scope.user.repos.concat(orgRepos);

        repoContributions = repoContributions.filter(function(r){
            return r.contribution;
        }).map(function(f){return f.contribution;});

        var additions = [], deletions = [], labels = [];
        
        var startWeek = startDate.add(1, 'w').startOf('week');     
        var startWeekOffset = moment(startWeek).add(startWeek.utcOffset(), 'minutes');    
        var selectedContributions = repoContributions
                .map(function(rc){return rc.weeks;})
                .flatten().filter(function(w){
                    return w.w >= startWeekOffset.unix() && w.w <= endDate.unix();
                })

        var range = moment.range(startWeek, endDate);

        range.by('weeks', function(currentWeek){
            var currentWeekUnix = currentWeek.add(currentWeek.utcOffset(), 'minutes');    
            var repoWeeks = selectedContributions.filter(function(w){                    
                return w.w == currentWeekUnix.unix();
            });
            var additionsSum = repoWeeks.reduce(function(prev, curr){return prev + curr.a;}, 0);
            var deletionsSum = repoWeeks.reduce(function(prev, curr) {return prev + curr.d;}, 0);
            
            labels.push(currentWeek.format('D-MMM-YY'));
            additions.push(additionsSum);
            deletions.push(deletionsSum);
        });

        $scope.chart.labels = labels;
        $scope.chart.data = [additions, deletions];
    };

    var loadRepos = userApi.getUserRepos(updateRateLimit)
        .then(function(repos){
            return $q.all(repos.map(function(repo){
                return repoApi.getContributions(repo, updateRateLimit)
                    .then(function(contributions){
                        repo.contribution = contributions.filter(function (contrib) {
                            return contrib.author.login === $user._json.login;
                        })[0];
                        return repo;
                    })
                    .then(function(repoWithContributions){
                        user.repos.push(repoWithContributions);
                    });
            }));
        });

    var loadOrgRepos = userApi.getUserOrgs(updateRateLimit)
        .then(function(orgs){
            return $q.all(orgs.map(function(org){
                org.repos = [];
                $user.orgs.push(org);
                return repoApi.getOrgRepos(org,updateRateLimit)
                    .then(function(repos){
                        return $q.all(repos.map(function(repo){
                            return repoApi.getContributions(repo, updateRateLimit)
                                .then(function(contributions){
                                    repo.contribution = contributions.filter(function (contrib) {
                                        return contrib.author.login === $user._json.login;
                                    })[0];
                                    return repo;
                                })
                                .then(function(repoWithContributions){
                                    org.repos.push(repoWithContributions);
                                    return repoWithContributions;
                                });
                            })
                        );
                    })
                    .then(function(data){
                        return org;
                    })                    
                
            }));
        });

    $q.all([loadRepos, loadOrgRepos]).then(function(){
        return pushChartData($scope.chart.controls.startDate, $scope.chart.controls.endDate);
    }).then(function(){
        $scope.loading = false;
    });

    function updateRateLimit(result){
        var headers = result && result.headers;
        $scope.rateLimit = headers && headers()['x-ratelimit-remaining'] || $scope.rateLimit || 0;
    }
}]);



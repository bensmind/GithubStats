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

var mod = angular.module('ghys', [ 'chart.js' ])
mod.constant('moment', moment)
mod.value('$user', user);

mod.controller('homeCtrl', ['$scope', '$http', '$user', '$q', 'moment', function($scope, $http, $user, $q, moment){
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
        labels:[],
        series:['Additions', 'Deletions'],
        data:[],
        colours:['#55a532','#bd2c00'],
        controls:{
            startDate: moment().subtract(6, 'months').toDate(),
            endDate: moment().toDate()
        }
    };

    var utcOffset = moment().utcOffset(); //In minutes

    var pushChartData = function(repos){
        var repoContributions = repos.filter(function(r){
            return r.contribution;
        }).map(function(f){return f.contribution;});

        var additions = [], deletions = [], labels = [];

        var weekRange =[moment().subtract(6, 'month').startOf('week'),moment().endOf('week')]

        var weeks = repoContributions.map(function(rc){return rc.weeks;}).flatten()
            .filter(function(w){
                return moment.unix(w.w).isBetween(weekRange[0], weekRange[1]);
            });

        var i = weekRange[0].add(utcOffset, 'minutes');
        var nixs = []
        while(i < weekRange[1])
        {
            var nix = i.unix();
            nixs.push(nix);
            var repoWeeks = weeks.filter(function(w) {
                return w.w == nix;
            });
            var additionsSum = repoWeeks.reduce(function(prev, curr){return prev + curr.a;}, 0);
            var deletionsSum = repoWeeks.reduce(function(prev, curr) {return prev + curr.d;}, 0);

            labels.push(i.format('Wo-MM-YY'));
            additions.push(additionsSum);
            deletions.push(deletionsSum);

            i = i.add(1, 'week');
        }
        $scope.chart.labels = labels;
        $scope.chart.data = [additions, deletions];
    };

    var getContributions = function(repos) {
        return $q.all(repos.flatten().map(function (repo) {
            return $http({method: 'GET', url: repo.url + '/stats/contributors'})
                .then(function (result) {
                    updateRateLimit(result.headers);
                    var contribution = result.data.filter(function (contrib) {
                        return contrib.author.login === $user._json.login;
                    })[0];
                    repo.contribution = contribution;
                    return repo;
                })

            }));
    };

    function updateRateLimit(headers){
        $scope.rateLimit = headers && headers()['x-ratelimit-remaining'] || $scope.rateLimit || 0;
    }

    var p1 =$http({method:'GET', url:$user._json.repos_url})
            .then(function(result){
                updateRateLimit(result.headers);
                return result.data;
            })
        .then(getContributions);

    var p2 = $http({method:'GET', url:$user._json.organizations_url})
        .then(function(result){
            updateRateLimit(result.headers);
            [].push.apply($scope.user.orgs, result.data);
            return result.data;
        })
        .then(function(orgs){
            return $q.all(orgs.map(function(org){
                return $http({method:'GET', url:org.repos_url})
                    .then(function(result){
                        updateRateLimit(result.headers);
                        return result.data;
                    });
                }));
            })
        .then(getContributions);

    $q.all([p1, p2]).then(function(results){
        return $scope.user.repos =results.flatten();
    }).then(pushChartData);
}]);




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
mod.filter('nrFormat', function(){
    return function(number){
        if(number!= undefined){
            var abs = Math.abs(number);
            if(abs >= Math.pow(10, 12))// trillion
                number = (number / Math.pow(10, 12)).toFixed(1)+"t";
            else if (abs < Math.pow(10, 12) && abs >= Math.pow(10, 9))// billion
                number = (number / Math.pow(10, 9)).toFixed(1)+"b";
            else if (abs < Math.pow(10, 9) && abs >= Math.pow(10, 6))// million
                number = (number / Math.pow(10, 6)).toFixed(1)+"m";
            else if (abs < Math.pow(10, 6) && abs >= Math.pow(10, 3))// thousand
                number = (number / Math.pow(10, 3)).toFixed(1)+"k";
        }
        return number;
    }
});
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
    $scope.user.total = 0,$scope.user.additions =0, $scope.user.deletions = 0
    $scope.chart ={
        type:"StackedBar",
        options:{
            responsive:true,
            scaleBeginAtZero : false,
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

        var repoContributions = $scope.user.repos.filter(function(r){
            return r.contribution;
        }).map(function(f){return f.contribution;});

        var additions = [], deletions = [], labels = [];
        var weeks = repoContributions.map(function(rc){return rc.weeks;}).flatten()
            .filter(function(w){
                return moment.unix(w.w).isBetween(startDate, endDate);
            });

        var currentWeek = startDate.add(1, 'w').startOf('week').add(utcOffset, 'minutes');

        while(currentWeek < endDate)
        {
            var repoWeeks = weeks.filter(function(w) {
                return w.w == currentWeek.unix();
            });
            var additionsSum = repoWeeks.reduce(function(prev, curr){return prev + curr.a;}, 0);
            var deletionsSum = repoWeeks.reduce(function(prev, curr) {return prev + curr.d;}, 0);

            labels.push(currentWeek.format('D-MMM-YY'));
            additions.push(additionsSum);
            deletions.push(deletionsSum);


            currentWeek.add(1, 'week');
        }
        $scope.chart.labels = labels;
        $scope.user.additions = additions.reduce(function(prev, curr){return prev + curr;},0 );
        $scope.user.deletions = deletions.reduce(function(prev, curr){return prev + curr;},0 );
        $scope.user.total = $scope.user.additions + $scope.user.deletions;
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
    }).then(function(){
        return pushChartData($scope.chart.controls.startDate, $scope.chart.controls.endDate);
    });
}]);



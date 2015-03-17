var express = require('express');
var passport = require('passport');
var router = express.Router();

router.get('/auth/github',
    passport.authenticate('github', {scopes:['user:email', 'repo']}),
    function(req, res){ /*Intentionally no-op*/ });

router.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    function(req, res) {
        res.redirect('/');
    });

router.get('/auth/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

/* GET home page. */
router.get('/', function(req, res, next) {

    res.render('index', {user: req.user});
});

module.exports = router;

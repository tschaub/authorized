

module.exports = function() {
  return function(req, res, next) {
    var id = req.get('x-fake-user-id');
    if (id) {
      req.user = {id: id};
    }
    next();
  };
};

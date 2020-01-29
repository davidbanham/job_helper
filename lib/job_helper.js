"use strict";

var _cronParser = _interopRequireDefault(require("cron-parser"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var reapFactory = Job => () => Job.update({
  queued: false
}, {
  where: {
    queued: true,
    unlock_at: {
      $lt: new Date()
    }
  }
});

var calculateNextRun = (cron, lastRun) => {
  if (!cron) return new Date();

  if (cron === 'weekly') {
    var now = new Date(lastRun);
    var manjana = new Date();
    manjana.setDate(now.getDate() + 7);
    return manjana.toISOString();
  }

  if (cron === 'fortnightly') {
    var _now = new Date(lastRun);

    var _manjana = new Date();

    _manjana.setDate(_now.getDate() + 14);

    return _manjana.toISOString();
  }

  if (cron === 'monthly') {
    var _now2 = new Date(lastRun);

    var _manjana2 = new Date();

    _manjana2.setDate(_now2.getDate());

    _manjana2.setMonth(_now2.getMonth() + 1);
  }

  if (cron === 'quarterly') {
    var _now3 = new Date(lastRun);

    var _manjana3 = new Date();

    _manjana3.setDate(_now3.getDate());

    _manjana3.setMonth(_now3.getMonth() + 3);
  }

  var interval = _cronParser.default.parseExpression(cron, {
    currentDate: lastRun
  });

  return interval.next();
};

var finderFactory = (db, Job) =>
/*#__PURE__*/
_asyncToGenerator(function* () {
  var transactionOpts = {
    isolationLevel: db.Transaction.ISOLATION_LEVELS.SERIALIZABLE
  };
  var j = yield db.transaction(transactionOpts, transaction => Job.findOne({
    where: {
      queued: false,
      next_run_at: {
        $lt: new Date()
      }
    }
  }, {
    transaction
  }));

  if (!j) {
    return Promise.resolve();
  }

  j.set({
    queued: true,
    unlock_at: new Date(new Date().getTime() + j.dataValues.linger_ms)
  });
  return j.save();
});

var createFactory = Job =>
/*#__PURE__*/
function () {
  var _ref2 = _asyncToGenerator(function* (input) {
    var jobSpec = _objectSpread({}, input);

    if (!jobSpec.last_run_at) jobSpec.last_run_at = new Date(0);

    if (!jobSpec.next_run_at) {
      jobSpec.next_run_at = calculateNextRun(jobSpec.cron, jobSpec.last_run_at);
    }

    return Job.create(jobSpec);
  });

  return function (_x) {
    return _ref2.apply(this, arguments);
  };
}();

var completionMarkerFactory = Job =>
/*#__PURE__*/
function () {
  var _ref3 = _asyncToGenerator(function* (jobId) {
    var job = yield Job.findById(jobId);

    if (!job) {
      return;
    }

    if (!job.dataValues.cron) {
      return job.destroy();
    }

    return job.update({
      queued: false,
      next_run_at: calculateNextRun(job.cron, new Date()),
      failures: 0
    });
  });

  return function (_x2) {
    return _ref3.apply(this, arguments);
  };
}();

var destroyFactory = Job =>
/*#__PURE__*/
function () {
  var _ref4 = _asyncToGenerator(function* (jobId) {
    var job = yield Job.findById(jobId);
    if (!job) return false;
    return yield job.destroy();
  });

  return function (_x3) {
    return _ref4.apply(this, arguments);
  };
}();

var failureMarker = (Job, backoffMs) =>
/*#__PURE__*/
function () {
  var _ref5 = _asyncToGenerator(function* (jobId) {
    var job = yield Job.findById(jobId);

    if (!job) {
      return false;
    }

    var {
      failures
    } = job.dataValues;
    var backoff = backoffMs * failures;
    var nextRun = new Date(new Date().getTime() + backoff);
    return job.update({
      queued: false,
      failures: failures + 1,
      next_run_at: nextRun
    });
  });

  return function (_x4) {
    return _ref5.apply(this, arguments);
  };
}();

module.exports = opts => {
  var options = Object.assign({
    reapInterval: 60000,
    backoffMs: 60000
  }, opts);
  var Job = options.Job;
  var db = options.db;
  var reaper = setInterval(reapFactory(Job), options.reapInterval);
  return {
    findAJob: finderFactory(db, Job),
    markComplete: completionMarkerFactory(Job),
    markFailed: failureMarker(Job, options.backoffMs),
    create: createFactory(Job),
    destroy: destroyFactory(Job),
    reapFactory,
    reaper
  };
};
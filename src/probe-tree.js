function ProbeTree(treeToken, inNeighborNick, outNeighborNicks, currency) {
  this._treeToken = treeToken;
  this._inNeighborNick = inNeighborNick;
  this._createArgs = arguments;// for debugging
  this._currency = currency;
  this._pathTokens = {};
  for (var i=0; i<outNeighborNicks.length; i++) {
    this._pathTokens[outNeighborNicks[i]] = false;
  }
  this._outloopsReceived = []; // might use this in the future, for https://github.com/michielbdejong/ledgerloops/issues/28
  this._backtracksReceived = [];
  this._backtrackSent = false;
  this._loopFound = false;
}

ProbeTree.prototype.getCurrency = function() {
  return this._currency;
};

ProbeTree.prototype.getInNeighborNick = function() {
  return this._inNeighborNick;
};


ProbeTree.prototype.setLoopFound = function() {
  this._loopFound = true;
};

// FIXME: this is an ugly method signature, and it does multiple unrelated things, very entangle with ProbeEngine at the moment
ProbeTree.prototype.addPath = function(newPathToken, backtrackedPathToken, backtrackedOutNeighborNick) {
  var outNeighborNick;
  if (backtrackedPathToken && backtrackedOutNeighborNick) {
    if (this._pathTokens[backtrackedOutNeighborNick] === backtrackedPathToken) {
      this._backtracksReceived.push(backtrackedOutNeighborNick);
    } else {
      for (outNeighborNick in this._pathTokens) {
        // FIXME: this is all very dense code, type of thing you understand when you write it, but not when you read it back ;)
        if (this._pathTokens[outNeighborNick] === backtrackedPathToken) {
          this._outloopsReceived.push({
            pathToken: backtrackedPathToken,
            outboundOutNeighborNick: outNeighborNick,
            inboundOutNeighborNick: backtrackedOutNeighborNick,
          });
        }
      }
    }
  }
  // Pick the next outNeighbor to try, Depth-First-Search.
  for (outNeighborNick in this._pathTokens) {
    if (this._pathTokens[outNeighborNick] === false) {
      this._pathTokens[outNeighborNick] = newPathToken;
      return outNeighborNick;
     }
  }
  // All outNeighbors have been tried, backtrack Depth-First-Search.
  this._backtrackSent = backtrackedPathToken;
  // FIXME: pathToken was generated by ProbeEngine but is not used here,
  // that's a bit of a waste. See corresponding FIXME note in ProbeEngine code.
  return this._inNeighborNick;
};

// FIXME: this method was slapped on in response to issue #43, see if this can be
// refactored to make the code reflect better how the messages works among agents
ProbeTree.prototype.guessOutNeighbor = function(pathToken) {
  // so you received a pathToken for this tree, and you think it may be a loop, but
  // you hadn't seen this pathToken before, so you're not sure how the pathToken reached you.
  // probably not through a backtracked neighbor, although who knows what the backtracker got
  // up to, so check those last.
  // it might not even have reached you through one of your existing outNeighbors (in which case
  // there is no loop). But let's try to send it round again through one outNeighbor that did
  // not backtrack yet, and see if it comes back again.
  for (var outNeighborNick in this._pathTokens) {
    if (this._backtracksReceived.indexOf(outNeighborNick) === -1) {
      this._pathTokens[outNeighborNick] = pathToken; // FIXME: support multiple pathTokens per outNeighborNick here
      return outNeighborNick;
    }
  }
  for (outNeighborNick in this._pathTokens) {
    this._pathTokens[outNeighborNick] = pathToken; // FIXME: support multiple pathTokens per outNeighborNick here
    return outNeighborNick;
  }
};

ProbeTree.prototype.getPeerPair = function(pathToken, newInNeighborNick) {
  if (typeof this._inNeighborNick === 'undefined') {
console.log('setting inNeighborNick, this ProbeTree was created here and didnt have one', newInNeighborNick);
    this._inNeighborNick = newInNeighborNick;
  }
  if (typeof this._inNeighborNick === 'undefined') {
    console.log(this);
    throw new Error('cannot ask me for a peer pair if I have no in-neighbor!');
  }
  if (this._backtracked === pathToken) {
    return {
      inNeighborNick: this._inNeighborNick,
      outNeighborNick: this._inNeighborNick,
      weBacktrackedThisPathToken: true,
    };
  }
console.log('looking at pathTokens for outNeighborNick', this._pathTokens, pathToken);
  for (var outNeighborNick in this._pathTokens) {
    if (this._pathTokens[outNeighborNick] === pathToken) {
      return {
        inNeighborNick: this._inNeighborNick,
        outNeighborNick,
      };
    }
  }
  throw new Error('Cannot ask me for a peerpair if I havent routed this pathToken to any out-neighbor before!');
};

ProbeTree.prototype.getProbeObj = function(outNeighborNick) {
  if (typeof this._pathTokens[outNeighborNick] === 'undefined') {
    return null;
  }
  return {
    treeToken: this._treeToken,
    pathToken: this._pathTokens[outNeighborNick],
    currency: this._currency,
    outNeighborNick,
  };
};

module.exports = ProbeTree;

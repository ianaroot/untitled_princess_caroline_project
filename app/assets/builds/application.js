var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@rails/actioncable/src/adapters.js
var adapters_default;
var init_adapters = __esm({
  "node_modules/@rails/actioncable/src/adapters.js"() {
    adapters_default = {
      logger: self.console,
      WebSocket: self.WebSocket
    };
  }
});

// node_modules/@rails/actioncable/src/logger.js
var logger_default;
var init_logger = __esm({
  "node_modules/@rails/actioncable/src/logger.js"() {
    init_adapters();
    logger_default = {
      log(...messages) {
        if (this.enabled) {
          messages.push(Date.now());
          adapters_default.logger.log("[ActionCable]", ...messages);
        }
      }
    };
  }
});

// node_modules/@rails/actioncable/src/connection_monitor.js
var now, secondsSince, ConnectionMonitor, connection_monitor_default;
var init_connection_monitor = __esm({
  "node_modules/@rails/actioncable/src/connection_monitor.js"() {
    init_logger();
    now = () => (/* @__PURE__ */ new Date()).getTime();
    secondsSince = (time) => (now() - time) / 1e3;
    ConnectionMonitor = class {
      constructor(connection) {
        this.visibilityDidChange = this.visibilityDidChange.bind(this);
        this.connection = connection;
        this.reconnectAttempts = 0;
      }
      start() {
        if (!this.isRunning()) {
          this.startedAt = now();
          delete this.stoppedAt;
          this.startPolling();
          addEventListener("visibilitychange", this.visibilityDidChange);
          logger_default.log(`ConnectionMonitor started. stale threshold = ${this.constructor.staleThreshold} s`);
        }
      }
      stop() {
        if (this.isRunning()) {
          this.stoppedAt = now();
          this.stopPolling();
          removeEventListener("visibilitychange", this.visibilityDidChange);
          logger_default.log("ConnectionMonitor stopped");
        }
      }
      isRunning() {
        return this.startedAt && !this.stoppedAt;
      }
      recordPing() {
        this.pingedAt = now();
      }
      recordConnect() {
        this.reconnectAttempts = 0;
        this.recordPing();
        delete this.disconnectedAt;
        logger_default.log("ConnectionMonitor recorded connect");
      }
      recordDisconnect() {
        this.disconnectedAt = now();
        logger_default.log("ConnectionMonitor recorded disconnect");
      }
      // Private
      startPolling() {
        this.stopPolling();
        this.poll();
      }
      stopPolling() {
        clearTimeout(this.pollTimeout);
      }
      poll() {
        this.pollTimeout = setTimeout(
          () => {
            this.reconnectIfStale();
            this.poll();
          },
          this.getPollInterval()
        );
      }
      getPollInterval() {
        const { staleThreshold, reconnectionBackoffRate } = this.constructor;
        const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10));
        const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate;
        const jitter = jitterMax * Math.random();
        return staleThreshold * 1e3 * backoff * (1 + jitter);
      }
      reconnectIfStale() {
        if (this.connectionIsStale()) {
          logger_default.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince(this.refreshedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`);
          this.reconnectAttempts++;
          if (this.disconnectedRecently()) {
            logger_default.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince(this.disconnectedAt)} s`);
          } else {
            logger_default.log("ConnectionMonitor reopening");
            this.connection.reopen();
          }
        }
      }
      get refreshedAt() {
        return this.pingedAt ? this.pingedAt : this.startedAt;
      }
      connectionIsStale() {
        return secondsSince(this.refreshedAt) > this.constructor.staleThreshold;
      }
      disconnectedRecently() {
        return this.disconnectedAt && secondsSince(this.disconnectedAt) < this.constructor.staleThreshold;
      }
      visibilityDidChange() {
        if (document.visibilityState === "visible") {
          setTimeout(
            () => {
              if (this.connectionIsStale() || !this.connection.isOpen()) {
                logger_default.log(`ConnectionMonitor reopening stale connection on visibilitychange. visibilityState = ${document.visibilityState}`);
                this.connection.reopen();
              }
            },
            200
          );
        }
      }
    };
    ConnectionMonitor.staleThreshold = 6;
    ConnectionMonitor.reconnectionBackoffRate = 0.15;
    connection_monitor_default = ConnectionMonitor;
  }
});

// node_modules/@rails/actioncable/src/internal.js
var internal_default;
var init_internal = __esm({
  "node_modules/@rails/actioncable/src/internal.js"() {
    internal_default = {
      "message_types": {
        "welcome": "welcome",
        "disconnect": "disconnect",
        "ping": "ping",
        "confirmation": "confirm_subscription",
        "rejection": "reject_subscription"
      },
      "disconnect_reasons": {
        "unauthorized": "unauthorized",
        "invalid_request": "invalid_request",
        "server_restart": "server_restart",
        "remote": "remote"
      },
      "default_mount_path": "/cable",
      "protocols": [
        "actioncable-v1-json",
        "actioncable-unsupported"
      ]
    };
  }
});

// node_modules/@rails/actioncable/src/connection.js
var message_types, protocols, supportedProtocols, indexOf, Connection, connection_default;
var init_connection = __esm({
  "node_modules/@rails/actioncable/src/connection.js"() {
    init_adapters();
    init_connection_monitor();
    init_internal();
    init_logger();
    ({ message_types, protocols } = internal_default);
    supportedProtocols = protocols.slice(0, protocols.length - 1);
    indexOf = [].indexOf;
    Connection = class {
      constructor(consumer2) {
        this.open = this.open.bind(this);
        this.consumer = consumer2;
        this.subscriptions = this.consumer.subscriptions;
        this.monitor = new connection_monitor_default(this);
        this.disconnected = true;
      }
      send(data) {
        if (this.isOpen()) {
          this.webSocket.send(JSON.stringify(data));
          return true;
        } else {
          return false;
        }
      }
      open() {
        if (this.isActive()) {
          logger_default.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`);
          return false;
        } else {
          const socketProtocols = [...protocols, ...this.consumer.subprotocols || []];
          logger_default.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${socketProtocols}`);
          if (this.webSocket) {
            this.uninstallEventHandlers();
          }
          this.webSocket = new adapters_default.WebSocket(this.consumer.url, socketProtocols);
          this.installEventHandlers();
          this.monitor.start();
          return true;
        }
      }
      close({ allowReconnect } = { allowReconnect: true }) {
        if (!allowReconnect) {
          this.monitor.stop();
        }
        if (this.isOpen()) {
          return this.webSocket.close();
        }
      }
      reopen() {
        logger_default.log(`Reopening WebSocket, current state is ${this.getState()}`);
        if (this.isActive()) {
          try {
            return this.close();
          } catch (error) {
            logger_default.log("Failed to reopen WebSocket", error);
          } finally {
            logger_default.log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`);
            setTimeout(this.open, this.constructor.reopenDelay);
          }
        } else {
          return this.open();
        }
      }
      getProtocol() {
        if (this.webSocket) {
          return this.webSocket.protocol;
        }
      }
      isOpen() {
        return this.isState("open");
      }
      isActive() {
        return this.isState("open", "connecting");
      }
      triedToReconnect() {
        return this.monitor.reconnectAttempts > 0;
      }
      // Private
      isProtocolSupported() {
        return indexOf.call(supportedProtocols, this.getProtocol()) >= 0;
      }
      isState(...states) {
        return indexOf.call(states, this.getState()) >= 0;
      }
      getState() {
        if (this.webSocket) {
          for (let state in adapters_default.WebSocket) {
            if (adapters_default.WebSocket[state] === this.webSocket.readyState) {
              return state.toLowerCase();
            }
          }
        }
        return null;
      }
      installEventHandlers() {
        for (let eventName in this.events) {
          const handler = this.events[eventName].bind(this);
          this.webSocket[`on${eventName}`] = handler;
        }
      }
      uninstallEventHandlers() {
        for (let eventName in this.events) {
          this.webSocket[`on${eventName}`] = function() {
          };
        }
      }
    };
    Connection.reopenDelay = 500;
    Connection.prototype.events = {
      message(event) {
        if (!this.isProtocolSupported()) {
          return;
        }
        const { identifier, message, reason, reconnect, type } = JSON.parse(event.data);
        switch (type) {
          case message_types.welcome:
            if (this.triedToReconnect()) {
              this.reconnectAttempted = true;
            }
            this.monitor.recordConnect();
            return this.subscriptions.reload();
          case message_types.disconnect:
            logger_default.log(`Disconnecting. Reason: ${reason}`);
            return this.close({ allowReconnect: reconnect });
          case message_types.ping:
            return this.monitor.recordPing();
          case message_types.confirmation:
            this.subscriptions.confirmSubscription(identifier);
            if (this.reconnectAttempted) {
              this.reconnectAttempted = false;
              return this.subscriptions.notify(identifier, "connected", { reconnected: true });
            } else {
              return this.subscriptions.notify(identifier, "connected", { reconnected: false });
            }
          case message_types.rejection:
            return this.subscriptions.reject(identifier);
          default:
            return this.subscriptions.notify(identifier, "received", message);
        }
      },
      open() {
        logger_default.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`);
        this.disconnected = false;
        if (!this.isProtocolSupported()) {
          logger_default.log("Protocol is unsupported. Stopping monitor and disconnecting.");
          return this.close({ allowReconnect: false });
        }
      },
      close(event) {
        logger_default.log("WebSocket onclose event");
        if (this.disconnected) {
          return;
        }
        this.disconnected = true;
        this.monitor.recordDisconnect();
        return this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() });
      },
      error() {
        logger_default.log("WebSocket onerror event");
      }
    };
    connection_default = Connection;
  }
});

// node_modules/@rails/actioncable/src/subscription.js
var extend, Subscription;
var init_subscription = __esm({
  "node_modules/@rails/actioncable/src/subscription.js"() {
    extend = function(object, properties) {
      if (properties != null) {
        for (let key in properties) {
          const value = properties[key];
          object[key] = value;
        }
      }
      return object;
    };
    Subscription = class {
      constructor(consumer2, params = {}, mixin) {
        this.consumer = consumer2;
        this.identifier = JSON.stringify(params);
        extend(this, mixin);
      }
      // Perform a channel action with the optional data passed as an attribute
      perform(action, data = {}) {
        data.action = action;
        return this.send(data);
      }
      send(data) {
        return this.consumer.send({ command: "message", identifier: this.identifier, data: JSON.stringify(data) });
      }
      unsubscribe() {
        return this.consumer.subscriptions.remove(this);
      }
    };
  }
});

// node_modules/@rails/actioncable/src/subscription_guarantor.js
var SubscriptionGuarantor, subscription_guarantor_default;
var init_subscription_guarantor = __esm({
  "node_modules/@rails/actioncable/src/subscription_guarantor.js"() {
    init_logger();
    SubscriptionGuarantor = class {
      constructor(subscriptions) {
        this.subscriptions = subscriptions;
        this.pendingSubscriptions = [];
      }
      guarantee(subscription) {
        if (this.pendingSubscriptions.indexOf(subscription) == -1) {
          logger_default.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`);
          this.pendingSubscriptions.push(subscription);
        } else {
          logger_default.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`);
        }
        this.startGuaranteeing();
      }
      forget(subscription) {
        logger_default.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`);
        this.pendingSubscriptions = this.pendingSubscriptions.filter((s) => s !== subscription);
      }
      startGuaranteeing() {
        this.stopGuaranteeing();
        this.retrySubscribing();
      }
      stopGuaranteeing() {
        clearTimeout(this.retryTimeout);
      }
      retrySubscribing() {
        this.retryTimeout = setTimeout(
          () => {
            if (this.subscriptions && typeof this.subscriptions.subscribe === "function") {
              this.pendingSubscriptions.map((subscription) => {
                logger_default.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`);
                this.subscriptions.subscribe(subscription);
              });
            }
          },
          500
        );
      }
    };
    subscription_guarantor_default = SubscriptionGuarantor;
  }
});

// node_modules/@rails/actioncable/src/subscriptions.js
var Subscriptions;
var init_subscriptions = __esm({
  "node_modules/@rails/actioncable/src/subscriptions.js"() {
    init_subscription();
    init_subscription_guarantor();
    init_logger();
    Subscriptions = class {
      constructor(consumer2) {
        this.consumer = consumer2;
        this.guarantor = new subscription_guarantor_default(this);
        this.subscriptions = [];
      }
      create(channelName, mixin) {
        const channel = channelName;
        const params = typeof channel === "object" ? channel : { channel };
        const subscription = new Subscription(this.consumer, params, mixin);
        return this.add(subscription);
      }
      // Private
      add(subscription) {
        this.subscriptions.push(subscription);
        this.consumer.ensureActiveConnection();
        this.notify(subscription, "initialized");
        this.subscribe(subscription);
        return subscription;
      }
      remove(subscription) {
        this.forget(subscription);
        if (!this.findAll(subscription.identifier).length) {
          this.sendCommand(subscription, "unsubscribe");
        }
        return subscription;
      }
      reject(identifier) {
        return this.findAll(identifier).map((subscription) => {
          this.forget(subscription);
          this.notify(subscription, "rejected");
          return subscription;
        });
      }
      forget(subscription) {
        this.guarantor.forget(subscription);
        this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
        return subscription;
      }
      findAll(identifier) {
        return this.subscriptions.filter((s) => s.identifier === identifier);
      }
      reload() {
        return this.subscriptions.map((subscription) => this.subscribe(subscription));
      }
      notifyAll(callbackName, ...args) {
        return this.subscriptions.map((subscription) => this.notify(subscription, callbackName, ...args));
      }
      notify(subscription, callbackName, ...args) {
        let subscriptions;
        if (typeof subscription === "string") {
          subscriptions = this.findAll(subscription);
        } else {
          subscriptions = [subscription];
        }
        return subscriptions.map((subscription2) => typeof subscription2[callbackName] === "function" ? subscription2[callbackName](...args) : void 0);
      }
      subscribe(subscription) {
        if (this.sendCommand(subscription, "subscribe")) {
          this.guarantor.guarantee(subscription);
        }
      }
      confirmSubscription(identifier) {
        logger_default.log(`Subscription confirmed ${identifier}`);
        this.findAll(identifier).map((subscription) => this.guarantor.forget(subscription));
      }
      sendCommand(subscription, command) {
        const { identifier } = subscription;
        return this.consumer.send({ command, identifier });
      }
    };
  }
});

// node_modules/@rails/actioncable/src/consumer.js
function createWebSocketURL(url) {
  if (typeof url === "function") {
    url = url();
  }
  if (url && !/^wss?:/i.test(url)) {
    const a = document.createElement("a");
    a.href = url;
    a.href = a.href;
    a.protocol = a.protocol.replace("http", "ws");
    return a.href;
  } else {
    return url;
  }
}
var Consumer;
var init_consumer = __esm({
  "node_modules/@rails/actioncable/src/consumer.js"() {
    init_connection();
    init_subscriptions();
    Consumer = class {
      constructor(url) {
        this._url = url;
        this.subscriptions = new Subscriptions(this);
        this.connection = new connection_default(this);
        this.subprotocols = [];
      }
      get url() {
        return createWebSocketURL(this._url);
      }
      send(data) {
        return this.connection.send(data);
      }
      connect() {
        return this.connection.open();
      }
      disconnect() {
        return this.connection.close({ allowReconnect: false });
      }
      ensureActiveConnection() {
        if (!this.connection.isActive()) {
          return this.connection.open();
        }
      }
      addSubProtocol(subprotocol) {
        this.subprotocols = [...this.subprotocols, subprotocol];
      }
    };
  }
});

// node_modules/@rails/actioncable/src/index.js
var src_exports = {};
__export(src_exports, {
  Connection: () => connection_default,
  ConnectionMonitor: () => connection_monitor_default,
  Consumer: () => Consumer,
  INTERNAL: () => internal_default,
  Subscription: () => Subscription,
  SubscriptionGuarantor: () => subscription_guarantor_default,
  Subscriptions: () => Subscriptions,
  adapters: () => adapters_default,
  createConsumer: () => createConsumer,
  createWebSocketURL: () => createWebSocketURL,
  getConfig: () => getConfig,
  logger: () => logger_default
});
function createConsumer(url = getConfig("url") || internal_default.default_mount_path) {
  return new Consumer(url);
}
function getConfig(name) {
  const element = document.head.querySelector(`meta[name='action-cable-${name}']`);
  if (element) {
    return element.getAttribute("content");
  }
}
var init_src = __esm({
  "node_modules/@rails/actioncable/src/index.js"() {
    init_connection();
    init_connection_monitor();
    init_consumer();
    init_internal();
    init_subscription();
    init_subscriptions();
    init_subscription_guarantor();
    init_adapters();
    init_logger();
  }
});

// node_modules/@hotwired/turbo/dist/turbo.es2017-esm.js
var turbo_es2017_esm_exports = {};
__export(turbo_es2017_esm_exports, {
  FetchEnctype: () => FetchEnctype,
  FetchMethod: () => FetchMethod,
  FetchRequest: () => FetchRequest,
  FetchResponse: () => FetchResponse,
  FrameElement: () => FrameElement,
  FrameLoadingStyle: () => FrameLoadingStyle,
  FrameRenderer: () => FrameRenderer,
  PageRenderer: () => PageRenderer,
  PageSnapshot: () => PageSnapshot,
  StreamActions: () => StreamActions,
  StreamElement: () => StreamElement,
  StreamSourceElement: () => StreamSourceElement,
  cache: () => cache,
  clearCache: () => clearCache,
  connectStreamSource: () => connectStreamSource,
  disconnectStreamSource: () => disconnectStreamSource,
  fetch: () => fetchWithTurboHeaders,
  fetchEnctypeFromString: () => fetchEnctypeFromString,
  fetchMethodFromString: () => fetchMethodFromString,
  isSafe: () => isSafe,
  navigator: () => navigator$1,
  registerAdapter: () => registerAdapter,
  renderStreamMessage: () => renderStreamMessage,
  session: () => session,
  setConfirmMethod: () => setConfirmMethod,
  setFormMode: () => setFormMode,
  setProgressBarDelay: () => setProgressBarDelay,
  start: () => start,
  visit: () => visit
});
(function(prototype) {
  if (typeof prototype.requestSubmit == "function")
    return;
  prototype.requestSubmit = function(submitter) {
    if (submitter) {
      validateSubmitter(submitter, this);
      submitter.click();
    } else {
      submitter = document.createElement("input");
      submitter.type = "submit";
      submitter.hidden = true;
      this.appendChild(submitter);
      submitter.click();
      this.removeChild(submitter);
    }
  };
  function validateSubmitter(submitter, form) {
    submitter instanceof HTMLElement || raise(TypeError, "parameter 1 is not of type 'HTMLElement'");
    submitter.type == "submit" || raise(TypeError, "The specified element is not a submit button");
    submitter.form == form || raise(DOMException, "The specified element is not owned by this form element", "NotFoundError");
  }
  function raise(errorConstructor, message, name) {
    throw new errorConstructor("Failed to execute 'requestSubmit' on 'HTMLFormElement': " + message + ".", name);
  }
})(HTMLFormElement.prototype);
var submittersByForm = /* @__PURE__ */ new WeakMap();
function findSubmitterFromClickTarget(target) {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  const candidate = element ? element.closest("input, button") : null;
  return candidate?.type == "submit" ? candidate : null;
}
function clickCaptured(event) {
  const submitter = findSubmitterFromClickTarget(event.target);
  if (submitter && submitter.form) {
    submittersByForm.set(submitter.form, submitter);
  }
}
(function() {
  if ("submitter" in Event.prototype)
    return;
  let prototype = window.Event.prototype;
  if ("SubmitEvent" in window) {
    const prototypeOfSubmitEvent = window.SubmitEvent.prototype;
    if (/Apple Computer/.test(navigator.vendor) && !("submitter" in prototypeOfSubmitEvent)) {
      prototype = prototypeOfSubmitEvent;
    } else {
      return;
    }
  }
  addEventListener("click", clickCaptured, true);
  Object.defineProperty(prototype, "submitter", {
    get() {
      if (this.type == "submit" && this.target instanceof HTMLFormElement) {
        return submittersByForm.get(this.target);
      }
    }
  });
})();
var FrameLoadingStyle = {
  eager: "eager",
  lazy: "lazy"
};
var FrameElement = class _FrameElement extends HTMLElement {
  static delegateConstructor = void 0;
  loaded = Promise.resolve();
  static get observedAttributes() {
    return ["disabled", "complete", "loading", "src"];
  }
  constructor() {
    super();
    this.delegate = new _FrameElement.delegateConstructor(this);
  }
  connectedCallback() {
    this.delegate.connect();
  }
  disconnectedCallback() {
    this.delegate.disconnect();
  }
  reload() {
    return this.delegate.sourceURLReloaded();
  }
  attributeChangedCallback(name) {
    if (name == "loading") {
      this.delegate.loadingStyleChanged();
    } else if (name == "complete") {
      this.delegate.completeChanged();
    } else if (name == "src") {
      this.delegate.sourceURLChanged();
    } else {
      this.delegate.disabledChanged();
    }
  }
  /**
   * Gets the URL to lazily load source HTML from
   */
  get src() {
    return this.getAttribute("src");
  }
  /**
   * Sets the URL to lazily load source HTML from
   */
  set src(value) {
    if (value) {
      this.setAttribute("src", value);
    } else {
      this.removeAttribute("src");
    }
  }
  /**
   * Gets the refresh mode for the frame.
   */
  get refresh() {
    return this.getAttribute("refresh");
  }
  /**
   * Sets the refresh mode for the frame.
   */
  set refresh(value) {
    if (value) {
      this.setAttribute("refresh", value);
    } else {
      this.removeAttribute("refresh");
    }
  }
  /**
   * Determines if the element is loading
   */
  get loading() {
    return frameLoadingStyleFromString(this.getAttribute("loading") || "");
  }
  /**
   * Sets the value of if the element is loading
   */
  set loading(value) {
    if (value) {
      this.setAttribute("loading", value);
    } else {
      this.removeAttribute("loading");
    }
  }
  /**
   * Gets the disabled state of the frame.
   *
   * If disabled, no requests will be intercepted by the frame.
   */
  get disabled() {
    return this.hasAttribute("disabled");
  }
  /**
   * Sets the disabled state of the frame.
   *
   * If disabled, no requests will be intercepted by the frame.
   */
  set disabled(value) {
    if (value) {
      this.setAttribute("disabled", "");
    } else {
      this.removeAttribute("disabled");
    }
  }
  /**
   * Gets the autoscroll state of the frame.
   *
   * If true, the frame will be scrolled into view automatically on update.
   */
  get autoscroll() {
    return this.hasAttribute("autoscroll");
  }
  /**
   * Sets the autoscroll state of the frame.
   *
   * If true, the frame will be scrolled into view automatically on update.
   */
  set autoscroll(value) {
    if (value) {
      this.setAttribute("autoscroll", "");
    } else {
      this.removeAttribute("autoscroll");
    }
  }
  /**
   * Determines if the element has finished loading
   */
  get complete() {
    return !this.delegate.isLoading;
  }
  /**
   * Gets the active state of the frame.
   *
   * If inactive, source changes will not be observed.
   */
  get isActive() {
    return this.ownerDocument === document && !this.isPreview;
  }
  /**
   * Sets the active state of the frame.
   *
   * If inactive, source changes will not be observed.
   */
  get isPreview() {
    return this.ownerDocument?.documentElement?.hasAttribute("data-turbo-preview");
  }
};
function frameLoadingStyleFromString(style) {
  switch (style.toLowerCase()) {
    case "lazy":
      return FrameLoadingStyle.lazy;
    default:
      return FrameLoadingStyle.eager;
  }
}
function expandURL(locatable) {
  return new URL(locatable.toString(), document.baseURI);
}
function getAnchor(url) {
  let anchorMatch;
  if (url.hash) {
    return url.hash.slice(1);
  } else if (anchorMatch = url.href.match(/#(.*)$/)) {
    return anchorMatch[1];
  }
}
function getAction$1(form, submitter) {
  const action = submitter?.getAttribute("formaction") || form.getAttribute("action") || form.action;
  return expandURL(action);
}
function getExtension(url) {
  return (getLastPathComponent(url).match(/\.[^.]*$/) || [])[0] || "";
}
function isHTML(url) {
  return !!getExtension(url).match(/^(?:|\.(?:htm|html|xhtml|php))$/);
}
function isPrefixedBy(baseURL, url) {
  const prefix = getPrefix(url);
  return baseURL.href === expandURL(prefix).href || baseURL.href.startsWith(prefix);
}
function locationIsVisitable(location2, rootLocation) {
  return isPrefixedBy(location2, rootLocation) && isHTML(location2);
}
function getRequestURL(url) {
  const anchor = getAnchor(url);
  return anchor != null ? url.href.slice(0, -(anchor.length + 1)) : url.href;
}
function toCacheKey(url) {
  return getRequestURL(url);
}
function urlsAreEqual(left, right) {
  return expandURL(left).href == expandURL(right).href;
}
function getPathComponents(url) {
  return url.pathname.split("/").slice(1);
}
function getLastPathComponent(url) {
  return getPathComponents(url).slice(-1)[0];
}
function getPrefix(url) {
  return addTrailingSlash(url.origin + url.pathname);
}
function addTrailingSlash(value) {
  return value.endsWith("/") ? value : value + "/";
}
var FetchResponse = class {
  constructor(response) {
    this.response = response;
  }
  get succeeded() {
    return this.response.ok;
  }
  get failed() {
    return !this.succeeded;
  }
  get clientError() {
    return this.statusCode >= 400 && this.statusCode <= 499;
  }
  get serverError() {
    return this.statusCode >= 500 && this.statusCode <= 599;
  }
  get redirected() {
    return this.response.redirected;
  }
  get location() {
    return expandURL(this.response.url);
  }
  get isHTML() {
    return this.contentType && this.contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/);
  }
  get statusCode() {
    return this.response.status;
  }
  get contentType() {
    return this.header("Content-Type");
  }
  get responseText() {
    return this.response.clone().text();
  }
  get responseHTML() {
    if (this.isHTML) {
      return this.response.clone().text();
    } else {
      return Promise.resolve(void 0);
    }
  }
  header(name) {
    return this.response.headers.get(name);
  }
};
function activateScriptElement(element) {
  if (element.getAttribute("data-turbo-eval") == "false") {
    return element;
  } else {
    const createdScriptElement = document.createElement("script");
    const cspNonce = getMetaContent("csp-nonce");
    if (cspNonce) {
      createdScriptElement.nonce = cspNonce;
    }
    createdScriptElement.textContent = element.textContent;
    createdScriptElement.async = false;
    copyElementAttributes(createdScriptElement, element);
    return createdScriptElement;
  }
}
function copyElementAttributes(destinationElement, sourceElement) {
  for (const { name, value } of sourceElement.attributes) {
    destinationElement.setAttribute(name, value);
  }
}
function createDocumentFragment(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}
function dispatch(eventName, { target, cancelable, detail } = {}) {
  const event = new CustomEvent(eventName, {
    cancelable,
    bubbles: true,
    composed: true,
    detail
  });
  if (target && target.isConnected) {
    target.dispatchEvent(event);
  } else {
    document.documentElement.dispatchEvent(event);
  }
  return event;
}
function nextRepaint() {
  if (document.visibilityState === "hidden") {
    return nextEventLoopTick();
  } else {
    return nextAnimationFrame();
  }
}
function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
function nextEventLoopTick() {
  return new Promise((resolve) => setTimeout(() => resolve(), 0));
}
function nextMicrotask() {
  return Promise.resolve();
}
function parseHTMLDocument(html = "") {
  return new DOMParser().parseFromString(html, "text/html");
}
function unindent(strings, ...values) {
  const lines = interpolate(strings, values).replace(/^\n/, "").split("\n");
  const match = lines[0].match(/^\s+/);
  const indent = match ? match[0].length : 0;
  return lines.map((line) => line.slice(indent)).join("\n");
}
function interpolate(strings, values) {
  return strings.reduce((result, string, i) => {
    const value = values[i] == void 0 ? "" : values[i];
    return result + string + value;
  }, "");
}
function uuid() {
  return Array.from({ length: 36 }).map((_, i) => {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      return "-";
    } else if (i == 14) {
      return "4";
    } else if (i == 19) {
      return (Math.floor(Math.random() * 4) + 8).toString(16);
    } else {
      return Math.floor(Math.random() * 15).toString(16);
    }
  }).join("");
}
function getAttribute(attributeName, ...elements) {
  for (const value of elements.map((element) => element?.getAttribute(attributeName))) {
    if (typeof value == "string")
      return value;
  }
  return null;
}
function hasAttribute(attributeName, ...elements) {
  return elements.some((element) => element && element.hasAttribute(attributeName));
}
function markAsBusy(...elements) {
  for (const element of elements) {
    if (element.localName == "turbo-frame") {
      element.setAttribute("busy", "");
    }
    element.setAttribute("aria-busy", "true");
  }
}
function clearBusyState(...elements) {
  for (const element of elements) {
    if (element.localName == "turbo-frame") {
      element.removeAttribute("busy");
    }
    element.removeAttribute("aria-busy");
  }
}
function waitForLoad(element, timeoutInMilliseconds = 2e3) {
  return new Promise((resolve) => {
    const onComplete = () => {
      element.removeEventListener("error", onComplete);
      element.removeEventListener("load", onComplete);
      resolve();
    };
    element.addEventListener("load", onComplete, { once: true });
    element.addEventListener("error", onComplete, { once: true });
    setTimeout(resolve, timeoutInMilliseconds);
  });
}
function getHistoryMethodForAction(action) {
  switch (action) {
    case "replace":
      return history.replaceState;
    case "advance":
    case "restore":
      return history.pushState;
  }
}
function isAction(action) {
  return action == "advance" || action == "replace" || action == "restore";
}
function getVisitAction(...elements) {
  const action = getAttribute("data-turbo-action", ...elements);
  return isAction(action) ? action : null;
}
function getMetaElement(name) {
  return document.querySelector(`meta[name="${name}"]`);
}
function getMetaContent(name) {
  const element = getMetaElement(name);
  return element && element.content;
}
function setMetaContent(name, content) {
  let element = getMetaElement(name);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
  return element;
}
function findClosestRecursively(element, selector) {
  if (element instanceof Element) {
    return element.closest(selector) || findClosestRecursively(element.assignedSlot || element.getRootNode()?.host, selector);
  }
}
function elementIsFocusable(element) {
  const inertDisabledOrHidden = "[inert], :disabled, [hidden], details:not([open]), dialog:not([open])";
  return !!element && element.closest(inertDisabledOrHidden) == null && typeof element.focus == "function";
}
function queryAutofocusableElement(elementOrDocumentFragment) {
  return Array.from(elementOrDocumentFragment.querySelectorAll("[autofocus]")).find(elementIsFocusable);
}
async function around(callback, reader) {
  const before = reader();
  callback();
  await nextAnimationFrame();
  const after = reader();
  return [before, after];
}
var LimitedSet = class extends Set {
  constructor(maxSize) {
    super();
    this.maxSize = maxSize;
  }
  add(value) {
    if (this.size >= this.maxSize) {
      const iterator = this.values();
      const oldestValue = iterator.next().value;
      this.delete(oldestValue);
    }
    super.add(value);
  }
};
var recentRequests = new LimitedSet(20);
var nativeFetch = window.fetch;
function fetchWithTurboHeaders(url, options = {}) {
  const modifiedHeaders = new Headers(options.headers || {});
  const requestUID = uuid();
  recentRequests.add(requestUID);
  modifiedHeaders.append("X-Turbo-Request-Id", requestUID);
  return nativeFetch(url, {
    ...options,
    headers: modifiedHeaders
  });
}
function fetchMethodFromString(method) {
  switch (method.toLowerCase()) {
    case "get":
      return FetchMethod.get;
    case "post":
      return FetchMethod.post;
    case "put":
      return FetchMethod.put;
    case "patch":
      return FetchMethod.patch;
    case "delete":
      return FetchMethod.delete;
  }
}
var FetchMethod = {
  get: "get",
  post: "post",
  put: "put",
  patch: "patch",
  delete: "delete"
};
function fetchEnctypeFromString(encoding) {
  switch (encoding.toLowerCase()) {
    case FetchEnctype.multipart:
      return FetchEnctype.multipart;
    case FetchEnctype.plain:
      return FetchEnctype.plain;
    default:
      return FetchEnctype.urlEncoded;
  }
}
var FetchEnctype = {
  urlEncoded: "application/x-www-form-urlencoded",
  multipart: "multipart/form-data",
  plain: "text/plain"
};
var FetchRequest = class {
  abortController = new AbortController();
  #resolveRequestPromise = (_value) => {
  };
  constructor(delegate, method, location2, requestBody = new URLSearchParams(), target = null, enctype = FetchEnctype.urlEncoded) {
    const [url, body] = buildResourceAndBody(expandURL(location2), method, requestBody, enctype);
    this.delegate = delegate;
    this.url = url;
    this.target = target;
    this.fetchOptions = {
      credentials: "same-origin",
      redirect: "follow",
      method,
      headers: { ...this.defaultHeaders },
      body,
      signal: this.abortSignal,
      referrer: this.delegate.referrer?.href
    };
    this.enctype = enctype;
  }
  get method() {
    return this.fetchOptions.method;
  }
  set method(value) {
    const fetchBody = this.isSafe ? this.url.searchParams : this.fetchOptions.body || new FormData();
    const fetchMethod = fetchMethodFromString(value) || FetchMethod.get;
    this.url.search = "";
    const [url, body] = buildResourceAndBody(this.url, fetchMethod, fetchBody, this.enctype);
    this.url = url;
    this.fetchOptions.body = body;
    this.fetchOptions.method = fetchMethod;
  }
  get headers() {
    return this.fetchOptions.headers;
  }
  set headers(value) {
    this.fetchOptions.headers = value;
  }
  get body() {
    if (this.isSafe) {
      return this.url.searchParams;
    } else {
      return this.fetchOptions.body;
    }
  }
  set body(value) {
    this.fetchOptions.body = value;
  }
  get location() {
    return this.url;
  }
  get params() {
    return this.url.searchParams;
  }
  get entries() {
    return this.body ? Array.from(this.body.entries()) : [];
  }
  cancel() {
    this.abortController.abort();
  }
  async perform() {
    const { fetchOptions } = this;
    this.delegate.prepareRequest(this);
    await this.#allowRequestToBeIntercepted(fetchOptions);
    try {
      this.delegate.requestStarted(this);
      const response = await fetchWithTurboHeaders(this.url.href, fetchOptions);
      return await this.receive(response);
    } catch (error) {
      if (error.name !== "AbortError") {
        if (this.#willDelegateErrorHandling(error)) {
          this.delegate.requestErrored(this, error);
        }
        throw error;
      }
    } finally {
      this.delegate.requestFinished(this);
    }
  }
  async receive(response) {
    const fetchResponse = new FetchResponse(response);
    const event = dispatch("turbo:before-fetch-response", {
      cancelable: true,
      detail: { fetchResponse },
      target: this.target
    });
    if (event.defaultPrevented) {
      this.delegate.requestPreventedHandlingResponse(this, fetchResponse);
    } else if (fetchResponse.succeeded) {
      this.delegate.requestSucceededWithResponse(this, fetchResponse);
    } else {
      this.delegate.requestFailedWithResponse(this, fetchResponse);
    }
    return fetchResponse;
  }
  get defaultHeaders() {
    return {
      Accept: "text/html, application/xhtml+xml"
    };
  }
  get isSafe() {
    return isSafe(this.method);
  }
  get abortSignal() {
    return this.abortController.signal;
  }
  acceptResponseType(mimeType) {
    this.headers["Accept"] = [mimeType, this.headers["Accept"]].join(", ");
  }
  async #allowRequestToBeIntercepted(fetchOptions) {
    const requestInterception = new Promise((resolve) => this.#resolveRequestPromise = resolve);
    const event = dispatch("turbo:before-fetch-request", {
      cancelable: true,
      detail: {
        fetchOptions,
        url: this.url,
        resume: this.#resolveRequestPromise
      },
      target: this.target
    });
    this.url = event.detail.url;
    if (event.defaultPrevented)
      await requestInterception;
  }
  #willDelegateErrorHandling(error) {
    const event = dispatch("turbo:fetch-request-error", {
      target: this.target,
      cancelable: true,
      detail: { request: this, error }
    });
    return !event.defaultPrevented;
  }
};
function isSafe(fetchMethod) {
  return fetchMethodFromString(fetchMethod) == FetchMethod.get;
}
function buildResourceAndBody(resource, method, requestBody, enctype) {
  const searchParams = Array.from(requestBody).length > 0 ? new URLSearchParams(entriesExcludingFiles(requestBody)) : resource.searchParams;
  if (isSafe(method)) {
    return [mergeIntoURLSearchParams(resource, searchParams), null];
  } else if (enctype == FetchEnctype.urlEncoded) {
    return [resource, searchParams];
  } else {
    return [resource, requestBody];
  }
}
function entriesExcludingFiles(requestBody) {
  const entries = [];
  for (const [name, value] of requestBody) {
    if (value instanceof File)
      continue;
    else
      entries.push([name, value]);
  }
  return entries;
}
function mergeIntoURLSearchParams(url, requestBody) {
  const searchParams = new URLSearchParams(entriesExcludingFiles(requestBody));
  url.search = searchParams.toString();
  return url;
}
var AppearanceObserver = class {
  started = false;
  constructor(delegate, element) {
    this.delegate = delegate;
    this.element = element;
    this.intersectionObserver = new IntersectionObserver(this.intersect);
  }
  start() {
    if (!this.started) {
      this.started = true;
      this.intersectionObserver.observe(this.element);
    }
  }
  stop() {
    if (this.started) {
      this.started = false;
      this.intersectionObserver.unobserve(this.element);
    }
  }
  intersect = (entries) => {
    const lastEntry = entries.slice(-1)[0];
    if (lastEntry?.isIntersecting) {
      this.delegate.elementAppearedInViewport(this.element);
    }
  };
};
var StreamMessage = class {
  static contentType = "text/vnd.turbo-stream.html";
  static wrap(message) {
    if (typeof message == "string") {
      return new this(createDocumentFragment(message));
    } else {
      return message;
    }
  }
  constructor(fragment) {
    this.fragment = importStreamElements(fragment);
  }
};
function importStreamElements(fragment) {
  for (const element of fragment.querySelectorAll("turbo-stream")) {
    const streamElement = document.importNode(element, true);
    for (const inertScriptElement of streamElement.templateElement.content.querySelectorAll("script")) {
      inertScriptElement.replaceWith(activateScriptElement(inertScriptElement));
    }
    element.replaceWith(streamElement);
  }
  return fragment;
}
var FormSubmissionState = {
  initialized: "initialized",
  requesting: "requesting",
  waiting: "waiting",
  receiving: "receiving",
  stopping: "stopping",
  stopped: "stopped"
};
var FormSubmission = class _FormSubmission {
  state = FormSubmissionState.initialized;
  static confirmMethod(message, _element, _submitter) {
    return Promise.resolve(confirm(message));
  }
  constructor(delegate, formElement, submitter, mustRedirect = false) {
    const method = getMethod(formElement, submitter);
    const action = getAction(getFormAction(formElement, submitter), method);
    const body = buildFormData(formElement, submitter);
    const enctype = getEnctype(formElement, submitter);
    this.delegate = delegate;
    this.formElement = formElement;
    this.submitter = submitter;
    this.fetchRequest = new FetchRequest(this, method, action, body, formElement, enctype);
    this.mustRedirect = mustRedirect;
  }
  get method() {
    return this.fetchRequest.method;
  }
  set method(value) {
    this.fetchRequest.method = value;
  }
  get action() {
    return this.fetchRequest.url.toString();
  }
  set action(value) {
    this.fetchRequest.url = expandURL(value);
  }
  get body() {
    return this.fetchRequest.body;
  }
  get enctype() {
    return this.fetchRequest.enctype;
  }
  get isSafe() {
    return this.fetchRequest.isSafe;
  }
  get location() {
    return this.fetchRequest.url;
  }
  // The submission process
  async start() {
    const { initialized, requesting } = FormSubmissionState;
    const confirmationMessage = getAttribute("data-turbo-confirm", this.submitter, this.formElement);
    if (typeof confirmationMessage === "string") {
      const answer = await _FormSubmission.confirmMethod(confirmationMessage, this.formElement, this.submitter);
      if (!answer) {
        return;
      }
    }
    if (this.state == initialized) {
      this.state = requesting;
      return this.fetchRequest.perform();
    }
  }
  stop() {
    const { stopping, stopped } = FormSubmissionState;
    if (this.state != stopping && this.state != stopped) {
      this.state = stopping;
      this.fetchRequest.cancel();
      return true;
    }
  }
  // Fetch request delegate
  prepareRequest(request) {
    if (!request.isSafe) {
      const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token");
      if (token) {
        request.headers["X-CSRF-Token"] = token;
      }
    }
    if (this.requestAcceptsTurboStreamResponse(request)) {
      request.acceptResponseType(StreamMessage.contentType);
    }
  }
  requestStarted(_request) {
    this.state = FormSubmissionState.waiting;
    this.submitter?.setAttribute("disabled", "");
    this.setSubmitsWith();
    markAsBusy(this.formElement);
    dispatch("turbo:submit-start", {
      target: this.formElement,
      detail: { formSubmission: this }
    });
    this.delegate.formSubmissionStarted(this);
  }
  requestPreventedHandlingResponse(request, response) {
    this.result = { success: response.succeeded, fetchResponse: response };
  }
  requestSucceededWithResponse(request, response) {
    if (response.clientError || response.serverError) {
      this.delegate.formSubmissionFailedWithResponse(this, response);
    } else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
      const error = new Error("Form responses must redirect to another location");
      this.delegate.formSubmissionErrored(this, error);
    } else {
      this.state = FormSubmissionState.receiving;
      this.result = { success: true, fetchResponse: response };
      this.delegate.formSubmissionSucceededWithResponse(this, response);
    }
  }
  requestFailedWithResponse(request, response) {
    this.result = { success: false, fetchResponse: response };
    this.delegate.formSubmissionFailedWithResponse(this, response);
  }
  requestErrored(request, error) {
    this.result = { success: false, error };
    this.delegate.formSubmissionErrored(this, error);
  }
  requestFinished(_request) {
    this.state = FormSubmissionState.stopped;
    this.submitter?.removeAttribute("disabled");
    this.resetSubmitterText();
    clearBusyState(this.formElement);
    dispatch("turbo:submit-end", {
      target: this.formElement,
      detail: { formSubmission: this, ...this.result }
    });
    this.delegate.formSubmissionFinished(this);
  }
  // Private
  setSubmitsWith() {
    if (!this.submitter || !this.submitsWith)
      return;
    if (this.submitter.matches("button")) {
      this.originalSubmitText = this.submitter.innerHTML;
      this.submitter.innerHTML = this.submitsWith;
    } else if (this.submitter.matches("input")) {
      const input = this.submitter;
      this.originalSubmitText = input.value;
      input.value = this.submitsWith;
    }
  }
  resetSubmitterText() {
    if (!this.submitter || !this.originalSubmitText)
      return;
    if (this.submitter.matches("button")) {
      this.submitter.innerHTML = this.originalSubmitText;
    } else if (this.submitter.matches("input")) {
      const input = this.submitter;
      input.value = this.originalSubmitText;
    }
  }
  requestMustRedirect(request) {
    return !request.isSafe && this.mustRedirect;
  }
  requestAcceptsTurboStreamResponse(request) {
    return !request.isSafe || hasAttribute("data-turbo-stream", this.submitter, this.formElement);
  }
  get submitsWith() {
    return this.submitter?.getAttribute("data-turbo-submits-with");
  }
};
function buildFormData(formElement, submitter) {
  const formData = new FormData(formElement);
  const name = submitter?.getAttribute("name");
  const value = submitter?.getAttribute("value");
  if (name) {
    formData.append(name, value || "");
  }
  return formData;
}
function getCookieValue(cookieName) {
  if (cookieName != null) {
    const cookies = document.cookie ? document.cookie.split("; ") : [];
    const cookie = cookies.find((cookie2) => cookie2.startsWith(cookieName));
    if (cookie) {
      const value = cookie.split("=").slice(1).join("=");
      return value ? decodeURIComponent(value) : void 0;
    }
  }
}
function responseSucceededWithoutRedirect(response) {
  return response.statusCode == 200 && !response.redirected;
}
function getFormAction(formElement, submitter) {
  const formElementAction = typeof formElement.action === "string" ? formElement.action : null;
  if (submitter?.hasAttribute("formaction")) {
    return submitter.getAttribute("formaction") || "";
  } else {
    return formElement.getAttribute("action") || formElementAction || "";
  }
}
function getAction(formAction, fetchMethod) {
  const action = expandURL(formAction);
  if (isSafe(fetchMethod)) {
    action.search = "";
  }
  return action;
}
function getMethod(formElement, submitter) {
  const method = submitter?.getAttribute("formmethod") || formElement.getAttribute("method") || "";
  return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get;
}
function getEnctype(formElement, submitter) {
  return fetchEnctypeFromString(submitter?.getAttribute("formenctype") || formElement.enctype);
}
var Snapshot = class {
  constructor(element) {
    this.element = element;
  }
  get activeElement() {
    return this.element.ownerDocument.activeElement;
  }
  get children() {
    return [...this.element.children];
  }
  hasAnchor(anchor) {
    return this.getElementForAnchor(anchor) != null;
  }
  getElementForAnchor(anchor) {
    return anchor ? this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`) : null;
  }
  get isConnected() {
    return this.element.isConnected;
  }
  get firstAutofocusableElement() {
    return queryAutofocusableElement(this.element);
  }
  get permanentElements() {
    return queryPermanentElementsAll(this.element);
  }
  getPermanentElementById(id) {
    return getPermanentElementById(this.element, id);
  }
  getPermanentElementMapForSnapshot(snapshot) {
    const permanentElementMap = {};
    for (const currentPermanentElement of this.permanentElements) {
      const { id } = currentPermanentElement;
      const newPermanentElement = snapshot.getPermanentElementById(id);
      if (newPermanentElement) {
        permanentElementMap[id] = [currentPermanentElement, newPermanentElement];
      }
    }
    return permanentElementMap;
  }
};
function getPermanentElementById(node, id) {
  return node.querySelector(`#${id}[data-turbo-permanent]`);
}
function queryPermanentElementsAll(node) {
  return node.querySelectorAll("[id][data-turbo-permanent]");
}
var FormSubmitObserver = class {
  started = false;
  constructor(delegate, eventTarget) {
    this.delegate = delegate;
    this.eventTarget = eventTarget;
  }
  start() {
    if (!this.started) {
      this.eventTarget.addEventListener("submit", this.submitCaptured, true);
      this.started = true;
    }
  }
  stop() {
    if (this.started) {
      this.eventTarget.removeEventListener("submit", this.submitCaptured, true);
      this.started = false;
    }
  }
  submitCaptured = () => {
    this.eventTarget.removeEventListener("submit", this.submitBubbled, false);
    this.eventTarget.addEventListener("submit", this.submitBubbled, false);
  };
  submitBubbled = (event) => {
    if (!event.defaultPrevented) {
      const form = event.target instanceof HTMLFormElement ? event.target : void 0;
      const submitter = event.submitter || void 0;
      if (form && submissionDoesNotDismissDialog(form, submitter) && submissionDoesNotTargetIFrame(form, submitter) && this.delegate.willSubmitForm(form, submitter)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.delegate.formSubmitted(form, submitter);
      }
    }
  };
};
function submissionDoesNotDismissDialog(form, submitter) {
  const method = submitter?.getAttribute("formmethod") || form.getAttribute("method");
  return method != "dialog";
}
function submissionDoesNotTargetIFrame(form, submitter) {
  if (submitter?.hasAttribute("formtarget") || form.hasAttribute("target")) {
    const target = submitter?.getAttribute("formtarget") || form.target;
    for (const element of document.getElementsByName(target)) {
      if (element instanceof HTMLIFrameElement)
        return false;
    }
    return true;
  } else {
    return true;
  }
}
var View = class {
  #resolveRenderPromise = (_value) => {
  };
  #resolveInterceptionPromise = (_value) => {
  };
  constructor(delegate, element) {
    this.delegate = delegate;
    this.element = element;
  }
  // Scrolling
  scrollToAnchor(anchor) {
    const element = this.snapshot.getElementForAnchor(anchor);
    if (element) {
      this.scrollToElement(element);
      this.focusElement(element);
    } else {
      this.scrollToPosition({ x: 0, y: 0 });
    }
  }
  scrollToAnchorFromLocation(location2) {
    this.scrollToAnchor(getAnchor(location2));
  }
  scrollToElement(element) {
    element.scrollIntoView();
  }
  focusElement(element) {
    if (element instanceof HTMLElement) {
      if (element.hasAttribute("tabindex")) {
        element.focus();
      } else {
        element.setAttribute("tabindex", "-1");
        element.focus();
        element.removeAttribute("tabindex");
      }
    }
  }
  scrollToPosition({ x, y }) {
    this.scrollRoot.scrollTo(x, y);
  }
  scrollToTop() {
    this.scrollToPosition({ x: 0, y: 0 });
  }
  get scrollRoot() {
    return window;
  }
  // Rendering
  async render(renderer) {
    const { isPreview, shouldRender, newSnapshot: snapshot } = renderer;
    if (shouldRender) {
      try {
        this.renderPromise = new Promise((resolve) => this.#resolveRenderPromise = resolve);
        this.renderer = renderer;
        await this.prepareToRenderSnapshot(renderer);
        const renderInterception = new Promise((resolve) => this.#resolveInterceptionPromise = resolve);
        const options = { resume: this.#resolveInterceptionPromise, render: this.renderer.renderElement };
        const immediateRender = this.delegate.allowsImmediateRender(snapshot, isPreview, options);
        if (!immediateRender)
          await renderInterception;
        await this.renderSnapshot(renderer);
        this.delegate.viewRenderedSnapshot(snapshot, isPreview, this.renderer.renderMethod);
        this.delegate.preloadOnLoadLinksForView(this.element);
        this.finishRenderingSnapshot(renderer);
      } finally {
        delete this.renderer;
        this.#resolveRenderPromise(void 0);
        delete this.renderPromise;
      }
    } else {
      this.invalidate(renderer.reloadReason);
    }
  }
  invalidate(reason) {
    this.delegate.viewInvalidated(reason);
  }
  async prepareToRenderSnapshot(renderer) {
    this.markAsPreview(renderer.isPreview);
    await renderer.prepareToRender();
  }
  markAsPreview(isPreview) {
    if (isPreview) {
      this.element.setAttribute("data-turbo-preview", "");
    } else {
      this.element.removeAttribute("data-turbo-preview");
    }
  }
  markVisitDirection(direction) {
    this.element.setAttribute("data-turbo-visit-direction", direction);
  }
  unmarkVisitDirection() {
    this.element.removeAttribute("data-turbo-visit-direction");
  }
  async renderSnapshot(renderer) {
    await renderer.render();
  }
  finishRenderingSnapshot(renderer) {
    renderer.finishRendering();
  }
};
var FrameView = class extends View {
  missing() {
    this.element.innerHTML = `<strong class="turbo-frame-error">Content missing</strong>`;
  }
  get snapshot() {
    return new Snapshot(this.element);
  }
};
var LinkInterceptor = class {
  constructor(delegate, element) {
    this.delegate = delegate;
    this.element = element;
  }
  start() {
    this.element.addEventListener("click", this.clickBubbled);
    document.addEventListener("turbo:click", this.linkClicked);
    document.addEventListener("turbo:before-visit", this.willVisit);
  }
  stop() {
    this.element.removeEventListener("click", this.clickBubbled);
    document.removeEventListener("turbo:click", this.linkClicked);
    document.removeEventListener("turbo:before-visit", this.willVisit);
  }
  clickBubbled = (event) => {
    if (this.respondsToEventTarget(event.target)) {
      this.clickEvent = event;
    } else {
      delete this.clickEvent;
    }
  };
  linkClicked = (event) => {
    if (this.clickEvent && this.respondsToEventTarget(event.target) && event.target instanceof Element) {
      if (this.delegate.shouldInterceptLinkClick(event.target, event.detail.url, event.detail.originalEvent)) {
        this.clickEvent.preventDefault();
        event.preventDefault();
        this.delegate.linkClickIntercepted(event.target, event.detail.url, event.detail.originalEvent);
      }
    }
    delete this.clickEvent;
  };
  willVisit = (_event) => {
    delete this.clickEvent;
  };
  respondsToEventTarget(target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    return element && element.closest("turbo-frame, html") == this.element;
  }
};
var LinkClickObserver = class {
  started = false;
  constructor(delegate, eventTarget) {
    this.delegate = delegate;
    this.eventTarget = eventTarget;
  }
  start() {
    if (!this.started) {
      this.eventTarget.addEventListener("click", this.clickCaptured, true);
      this.started = true;
    }
  }
  stop() {
    if (this.started) {
      this.eventTarget.removeEventListener("click", this.clickCaptured, true);
      this.started = false;
    }
  }
  clickCaptured = () => {
    this.eventTarget.removeEventListener("click", this.clickBubbled, false);
    this.eventTarget.addEventListener("click", this.clickBubbled, false);
  };
  clickBubbled = (event) => {
    if (event instanceof MouseEvent && this.clickEventIsSignificant(event)) {
      const target = event.composedPath && event.composedPath()[0] || event.target;
      const link = this.findLinkFromClickTarget(target);
      if (link && doesNotTargetIFrame(link)) {
        const location2 = this.getLocationForLink(link);
        if (this.delegate.willFollowLinkToLocation(link, location2, event)) {
          event.preventDefault();
          this.delegate.followedLinkToLocation(link, location2);
        }
      }
    }
  };
  clickEventIsSignificant(event) {
    return !(event.target && event.target.isContentEditable || event.defaultPrevented || event.which > 1 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
  }
  findLinkFromClickTarget(target) {
    return findClosestRecursively(target, "a[href]:not([target^=_]):not([download])");
  }
  getLocationForLink(link) {
    return expandURL(link.getAttribute("href") || "");
  }
};
function doesNotTargetIFrame(anchor) {
  if (anchor.hasAttribute("target")) {
    for (const element of document.getElementsByName(anchor.target)) {
      if (element instanceof HTMLIFrameElement)
        return false;
    }
    return true;
  } else {
    return true;
  }
}
var FormLinkClickObserver = class {
  constructor(delegate, element) {
    this.delegate = delegate;
    this.linkInterceptor = new LinkClickObserver(this, element);
  }
  start() {
    this.linkInterceptor.start();
  }
  stop() {
    this.linkInterceptor.stop();
  }
  // Link click observer delegate
  willFollowLinkToLocation(link, location2, originalEvent) {
    return this.delegate.willSubmitFormLinkToLocation(link, location2, originalEvent) && (link.hasAttribute("data-turbo-method") || link.hasAttribute("data-turbo-stream"));
  }
  followedLinkToLocation(link, location2) {
    const form = document.createElement("form");
    const type = "hidden";
    for (const [name, value] of location2.searchParams) {
      form.append(Object.assign(document.createElement("input"), { type, name, value }));
    }
    const action = Object.assign(location2, { search: "" });
    form.setAttribute("data-turbo", "true");
    form.setAttribute("action", action.href);
    form.setAttribute("hidden", "");
    const method = link.getAttribute("data-turbo-method");
    if (method)
      form.setAttribute("method", method);
    const turboFrame = link.getAttribute("data-turbo-frame");
    if (turboFrame)
      form.setAttribute("data-turbo-frame", turboFrame);
    const turboAction = getVisitAction(link);
    if (turboAction)
      form.setAttribute("data-turbo-action", turboAction);
    const turboConfirm = link.getAttribute("data-turbo-confirm");
    if (turboConfirm)
      form.setAttribute("data-turbo-confirm", turboConfirm);
    const turboStream = link.hasAttribute("data-turbo-stream");
    if (turboStream)
      form.setAttribute("data-turbo-stream", "");
    this.delegate.submittedFormLinkToLocation(link, location2, form);
    document.body.appendChild(form);
    form.addEventListener("turbo:submit-end", () => form.remove(), { once: true });
    requestAnimationFrame(() => form.requestSubmit());
  }
};
var Bardo = class {
  static async preservingPermanentElements(delegate, permanentElementMap, callback) {
    const bardo = new this(delegate, permanentElementMap);
    bardo.enter();
    await callback();
    bardo.leave();
  }
  constructor(delegate, permanentElementMap) {
    this.delegate = delegate;
    this.permanentElementMap = permanentElementMap;
  }
  enter() {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id];
      this.delegate.enteringBardo(currentPermanentElement, newPermanentElement);
      this.replaceNewPermanentElementWithPlaceholder(newPermanentElement);
    }
  }
  leave() {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement] = this.permanentElementMap[id];
      this.replaceCurrentPermanentElementWithClone(currentPermanentElement);
      this.replacePlaceholderWithPermanentElement(currentPermanentElement);
      this.delegate.leavingBardo(currentPermanentElement);
    }
  }
  replaceNewPermanentElementWithPlaceholder(permanentElement) {
    const placeholder = createPlaceholderForPermanentElement(permanentElement);
    permanentElement.replaceWith(placeholder);
  }
  replaceCurrentPermanentElementWithClone(permanentElement) {
    const clone = permanentElement.cloneNode(true);
    permanentElement.replaceWith(clone);
  }
  replacePlaceholderWithPermanentElement(permanentElement) {
    const placeholder = this.getPlaceholderById(permanentElement.id);
    placeholder?.replaceWith(permanentElement);
  }
  getPlaceholderById(id) {
    return this.placeholders.find((element) => element.content == id);
  }
  get placeholders() {
    return [...document.querySelectorAll("meta[name=turbo-permanent-placeholder][content]")];
  }
};
function createPlaceholderForPermanentElement(permanentElement) {
  const element = document.createElement("meta");
  element.setAttribute("name", "turbo-permanent-placeholder");
  element.setAttribute("content", permanentElement.id);
  return element;
}
var Renderer = class {
  #activeElement = null;
  constructor(currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
    this.currentSnapshot = currentSnapshot;
    this.newSnapshot = newSnapshot;
    this.isPreview = isPreview;
    this.willRender = willRender;
    this.renderElement = renderElement;
    this.promise = new Promise((resolve, reject) => this.resolvingFunctions = { resolve, reject });
  }
  get shouldRender() {
    return true;
  }
  get reloadReason() {
    return;
  }
  prepareToRender() {
    return;
  }
  render() {
  }
  finishRendering() {
    if (this.resolvingFunctions) {
      this.resolvingFunctions.resolve();
      delete this.resolvingFunctions;
    }
  }
  async preservingPermanentElements(callback) {
    await Bardo.preservingPermanentElements(this, this.permanentElementMap, callback);
  }
  focusFirstAutofocusableElement() {
    const element = this.connectedSnapshot.firstAutofocusableElement;
    if (element) {
      element.focus();
    }
  }
  // Bardo delegate
  enteringBardo(currentPermanentElement) {
    if (this.#activeElement)
      return;
    if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
      this.#activeElement = this.currentSnapshot.activeElement;
    }
  }
  leavingBardo(currentPermanentElement) {
    if (currentPermanentElement.contains(this.#activeElement) && this.#activeElement instanceof HTMLElement) {
      this.#activeElement.focus();
      this.#activeElement = null;
    }
  }
  get connectedSnapshot() {
    return this.newSnapshot.isConnected ? this.newSnapshot : this.currentSnapshot;
  }
  get currentElement() {
    return this.currentSnapshot.element;
  }
  get newElement() {
    return this.newSnapshot.element;
  }
  get permanentElementMap() {
    return this.currentSnapshot.getPermanentElementMapForSnapshot(this.newSnapshot);
  }
  get renderMethod() {
    return "replace";
  }
};
var FrameRenderer = class extends Renderer {
  static renderElement(currentElement, newElement) {
    const destinationRange = document.createRange();
    destinationRange.selectNodeContents(currentElement);
    destinationRange.deleteContents();
    const frameElement = newElement;
    const sourceRange = frameElement.ownerDocument?.createRange();
    if (sourceRange) {
      sourceRange.selectNodeContents(frameElement);
      currentElement.appendChild(sourceRange.extractContents());
    }
  }
  constructor(delegate, currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
    super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender);
    this.delegate = delegate;
  }
  get shouldRender() {
    return true;
  }
  async render() {
    await nextRepaint();
    this.preservingPermanentElements(() => {
      this.loadFrameElement();
    });
    this.scrollFrameIntoView();
    await nextRepaint();
    this.focusFirstAutofocusableElement();
    await nextRepaint();
    this.activateScriptElements();
  }
  loadFrameElement() {
    this.delegate.willRenderFrame(this.currentElement, this.newElement);
    this.renderElement(this.currentElement, this.newElement);
  }
  scrollFrameIntoView() {
    if (this.currentElement.autoscroll || this.newElement.autoscroll) {
      const element = this.currentElement.firstElementChild;
      const block = readScrollLogicalPosition(this.currentElement.getAttribute("data-autoscroll-block"), "end");
      const behavior = readScrollBehavior(this.currentElement.getAttribute("data-autoscroll-behavior"), "auto");
      if (element) {
        element.scrollIntoView({ block, behavior });
        return true;
      }
    }
    return false;
  }
  activateScriptElements() {
    for (const inertScriptElement of this.newScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement);
      inertScriptElement.replaceWith(activatedScriptElement);
    }
  }
  get newScriptElements() {
    return this.currentElement.querySelectorAll("script");
  }
};
function readScrollLogicalPosition(value, defaultValue) {
  if (value == "end" || value == "start" || value == "center" || value == "nearest") {
    return value;
  } else {
    return defaultValue;
  }
}
function readScrollBehavior(value, defaultValue) {
  if (value == "auto" || value == "smooth") {
    return value;
  } else {
    return defaultValue;
  }
}
var ProgressBar = class _ProgressBar {
  static animationDuration = 300;
  /*ms*/
  static get defaultCSS() {
    return unindent`
      .turbo-progress-bar {
        position: fixed;
        display: block;
        top: 0;
        left: 0;
        height: 3px;
        background: #0076ff;
        z-index: 2147483647;
        transition:
          width ${_ProgressBar.animationDuration}ms ease-out,
          opacity ${_ProgressBar.animationDuration / 2}ms ${_ProgressBar.animationDuration / 2}ms ease-in;
        transform: translate3d(0, 0, 0);
      }
    `;
  }
  hiding = false;
  value = 0;
  visible = false;
  constructor() {
    this.stylesheetElement = this.createStylesheetElement();
    this.progressElement = this.createProgressElement();
    this.installStylesheetElement();
    this.setValue(0);
  }
  show() {
    if (!this.visible) {
      this.visible = true;
      this.installProgressElement();
      this.startTrickling();
    }
  }
  hide() {
    if (this.visible && !this.hiding) {
      this.hiding = true;
      this.fadeProgressElement(() => {
        this.uninstallProgressElement();
        this.stopTrickling();
        this.visible = false;
        this.hiding = false;
      });
    }
  }
  setValue(value) {
    this.value = value;
    this.refresh();
  }
  // Private
  installStylesheetElement() {
    document.head.insertBefore(this.stylesheetElement, document.head.firstChild);
  }
  installProgressElement() {
    this.progressElement.style.width = "0";
    this.progressElement.style.opacity = "1";
    document.documentElement.insertBefore(this.progressElement, document.body);
    this.refresh();
  }
  fadeProgressElement(callback) {
    this.progressElement.style.opacity = "0";
    setTimeout(callback, _ProgressBar.animationDuration * 1.5);
  }
  uninstallProgressElement() {
    if (this.progressElement.parentNode) {
      document.documentElement.removeChild(this.progressElement);
    }
  }
  startTrickling() {
    if (!this.trickleInterval) {
      this.trickleInterval = window.setInterval(this.trickle, _ProgressBar.animationDuration);
    }
  }
  stopTrickling() {
    window.clearInterval(this.trickleInterval);
    delete this.trickleInterval;
  }
  trickle = () => {
    this.setValue(this.value + Math.random() / 100);
  };
  refresh() {
    requestAnimationFrame(() => {
      this.progressElement.style.width = `${10 + this.value * 90}%`;
    });
  }
  createStylesheetElement() {
    const element = document.createElement("style");
    element.type = "text/css";
    element.textContent = _ProgressBar.defaultCSS;
    if (this.cspNonce) {
      element.nonce = this.cspNonce;
    }
    return element;
  }
  createProgressElement() {
    const element = document.createElement("div");
    element.className = "turbo-progress-bar";
    return element;
  }
  get cspNonce() {
    return getMetaContent("csp-nonce");
  }
};
var HeadSnapshot = class extends Snapshot {
  detailsByOuterHTML = this.children.filter((element) => !elementIsNoscript(element)).map((element) => elementWithoutNonce(element)).reduce((result, element) => {
    const { outerHTML } = element;
    const details = outerHTML in result ? result[outerHTML] : {
      type: elementType(element),
      tracked: elementIsTracked(element),
      elements: []
    };
    return {
      ...result,
      [outerHTML]: {
        ...details,
        elements: [...details.elements, element]
      }
    };
  }, {});
  get trackedElementSignature() {
    return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => this.detailsByOuterHTML[outerHTML].tracked).join("");
  }
  getScriptElementsNotInSnapshot(snapshot) {
    return this.getElementsMatchingTypeNotInSnapshot("script", snapshot);
  }
  getStylesheetElementsNotInSnapshot(snapshot) {
    return this.getElementsMatchingTypeNotInSnapshot("stylesheet", snapshot);
  }
  getElementsMatchingTypeNotInSnapshot(matchedType, snapshot) {
    return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => !(outerHTML in snapshot.detailsByOuterHTML)).map((outerHTML) => this.detailsByOuterHTML[outerHTML]).filter(({ type }) => type == matchedType).map(({ elements: [element] }) => element);
  }
  get provisionalElements() {
    return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
      const { type, tracked, elements } = this.detailsByOuterHTML[outerHTML];
      if (type == null && !tracked) {
        return [...result, ...elements];
      } else if (elements.length > 1) {
        return [...result, ...elements.slice(1)];
      } else {
        return result;
      }
    }, []);
  }
  getMetaValue(name) {
    const element = this.findMetaElementByName(name);
    return element ? element.getAttribute("content") : null;
  }
  findMetaElementByName(name) {
    return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
      const {
        elements: [element]
      } = this.detailsByOuterHTML[outerHTML];
      return elementIsMetaElementWithName(element, name) ? element : result;
    }, void 0 | void 0);
  }
};
function elementType(element) {
  if (elementIsScript(element)) {
    return "script";
  } else if (elementIsStylesheet(element)) {
    return "stylesheet";
  }
}
function elementIsTracked(element) {
  return element.getAttribute("data-turbo-track") == "reload";
}
function elementIsScript(element) {
  const tagName = element.localName;
  return tagName == "script";
}
function elementIsNoscript(element) {
  const tagName = element.localName;
  return tagName == "noscript";
}
function elementIsStylesheet(element) {
  const tagName = element.localName;
  return tagName == "style" || tagName == "link" && element.getAttribute("rel") == "stylesheet";
}
function elementIsMetaElementWithName(element, name) {
  const tagName = element.localName;
  return tagName == "meta" && element.getAttribute("name") == name;
}
function elementWithoutNonce(element) {
  if (element.hasAttribute("nonce")) {
    element.setAttribute("nonce", "");
  }
  return element;
}
var PageSnapshot = class _PageSnapshot extends Snapshot {
  static fromHTMLString(html = "") {
    return this.fromDocument(parseHTMLDocument(html));
  }
  static fromElement(element) {
    return this.fromDocument(element.ownerDocument);
  }
  static fromDocument({ documentElement, body, head }) {
    return new this(documentElement, body, new HeadSnapshot(head));
  }
  constructor(documentElement, body, headSnapshot) {
    super(body);
    this.documentElement = documentElement;
    this.headSnapshot = headSnapshot;
  }
  clone() {
    const clonedElement = this.element.cloneNode(true);
    const selectElements = this.element.querySelectorAll("select");
    const clonedSelectElements = clonedElement.querySelectorAll("select");
    for (const [index, source] of selectElements.entries()) {
      const clone = clonedSelectElements[index];
      for (const option of clone.selectedOptions)
        option.selected = false;
      for (const option of source.selectedOptions)
        clone.options[option.index].selected = true;
    }
    for (const clonedPasswordInput of clonedElement.querySelectorAll('input[type="password"]')) {
      clonedPasswordInput.value = "";
    }
    return new _PageSnapshot(this.documentElement, clonedElement, this.headSnapshot);
  }
  get lang() {
    return this.documentElement.getAttribute("lang");
  }
  get headElement() {
    return this.headSnapshot.element;
  }
  get rootLocation() {
    const root = this.getSetting("root") ?? "/";
    return expandURL(root);
  }
  get cacheControlValue() {
    return this.getSetting("cache-control");
  }
  get isPreviewable() {
    return this.cacheControlValue != "no-preview";
  }
  get isCacheable() {
    return this.cacheControlValue != "no-cache";
  }
  get isVisitable() {
    return this.getSetting("visit-control") != "reload";
  }
  get prefersViewTransitions() {
    return this.headSnapshot.getMetaValue("view-transition") === "same-origin";
  }
  get shouldMorphPage() {
    return this.getSetting("refresh-method") === "morph";
  }
  get shouldPreserveScrollPosition() {
    return this.getSetting("refresh-scroll") === "preserve";
  }
  // Private
  getSetting(name) {
    return this.headSnapshot.getMetaValue(`turbo-${name}`);
  }
};
var ViewTransitioner = class {
  #viewTransitionStarted = false;
  #lastOperation = Promise.resolve();
  renderChange(useViewTransition, render) {
    if (useViewTransition && this.viewTransitionsAvailable && !this.#viewTransitionStarted) {
      this.#viewTransitionStarted = true;
      this.#lastOperation = this.#lastOperation.then(async () => {
        await document.startViewTransition(render).finished;
      });
    } else {
      this.#lastOperation = this.#lastOperation.then(render);
    }
    return this.#lastOperation;
  }
  get viewTransitionsAvailable() {
    return document.startViewTransition;
  }
};
var defaultOptions = {
  action: "advance",
  historyChanged: false,
  visitCachedSnapshot: () => {
  },
  willRender: true,
  updateHistory: true,
  shouldCacheSnapshot: true,
  acceptsStreamResponse: false
};
var TimingMetric = {
  visitStart: "visitStart",
  requestStart: "requestStart",
  requestEnd: "requestEnd",
  visitEnd: "visitEnd"
};
var VisitState = {
  initialized: "initialized",
  started: "started",
  canceled: "canceled",
  failed: "failed",
  completed: "completed"
};
var SystemStatusCode = {
  networkFailure: 0,
  timeoutFailure: -1,
  contentTypeMismatch: -2
};
var Direction = {
  advance: "forward",
  restore: "back",
  replace: "none"
};
var Visit = class {
  identifier = uuid();
  // Required by turbo-ios
  timingMetrics = {};
  followedRedirect = false;
  historyChanged = false;
  scrolled = false;
  shouldCacheSnapshot = true;
  acceptsStreamResponse = false;
  snapshotCached = false;
  state = VisitState.initialized;
  viewTransitioner = new ViewTransitioner();
  constructor(delegate, location2, restorationIdentifier, options = {}) {
    this.delegate = delegate;
    this.location = location2;
    this.restorationIdentifier = restorationIdentifier || uuid();
    const {
      action,
      historyChanged,
      referrer,
      snapshot,
      snapshotHTML,
      response,
      visitCachedSnapshot,
      willRender,
      updateHistory,
      shouldCacheSnapshot,
      acceptsStreamResponse,
      direction
    } = {
      ...defaultOptions,
      ...options
    };
    this.action = action;
    this.historyChanged = historyChanged;
    this.referrer = referrer;
    this.snapshot = snapshot;
    this.snapshotHTML = snapshotHTML;
    this.response = response;
    this.isSamePage = this.delegate.locationWithActionIsSamePage(this.location, this.action);
    this.visitCachedSnapshot = visitCachedSnapshot;
    this.willRender = willRender;
    this.updateHistory = updateHistory;
    this.scrolled = !willRender;
    this.shouldCacheSnapshot = shouldCacheSnapshot;
    this.acceptsStreamResponse = acceptsStreamResponse;
    this.direction = direction || Direction[action];
  }
  get adapter() {
    return this.delegate.adapter;
  }
  get view() {
    return this.delegate.view;
  }
  get history() {
    return this.delegate.history;
  }
  get restorationData() {
    return this.history.getRestorationDataForIdentifier(this.restorationIdentifier);
  }
  get silent() {
    return this.isSamePage;
  }
  start() {
    if (this.state == VisitState.initialized) {
      this.recordTimingMetric(TimingMetric.visitStart);
      this.state = VisitState.started;
      this.adapter.visitStarted(this);
      this.delegate.visitStarted(this);
    }
  }
  cancel() {
    if (this.state == VisitState.started) {
      if (this.request) {
        this.request.cancel();
      }
      this.cancelRender();
      this.state = VisitState.canceled;
    }
  }
  complete() {
    if (this.state == VisitState.started) {
      this.recordTimingMetric(TimingMetric.visitEnd);
      this.state = VisitState.completed;
      this.followRedirect();
      if (!this.followedRedirect) {
        this.adapter.visitCompleted(this);
        this.delegate.visitCompleted(this);
      }
    }
  }
  fail() {
    if (this.state == VisitState.started) {
      this.state = VisitState.failed;
      this.adapter.visitFailed(this);
      this.delegate.visitCompleted(this);
    }
  }
  changeHistory() {
    if (!this.historyChanged && this.updateHistory) {
      const actionForHistory = this.location.href === this.referrer?.href ? "replace" : this.action;
      const method = getHistoryMethodForAction(actionForHistory);
      this.history.update(method, this.location, this.restorationIdentifier);
      this.historyChanged = true;
    }
  }
  issueRequest() {
    if (this.hasPreloadedResponse()) {
      this.simulateRequest();
    } else if (this.shouldIssueRequest() && !this.request) {
      this.request = new FetchRequest(this, FetchMethod.get, this.location);
      this.request.perform();
    }
  }
  simulateRequest() {
    if (this.response) {
      this.startRequest();
      this.recordResponse();
      this.finishRequest();
    }
  }
  startRequest() {
    this.recordTimingMetric(TimingMetric.requestStart);
    this.adapter.visitRequestStarted(this);
  }
  recordResponse(response = this.response) {
    this.response = response;
    if (response) {
      const { statusCode } = response;
      if (isSuccessful(statusCode)) {
        this.adapter.visitRequestCompleted(this);
      } else {
        this.adapter.visitRequestFailedWithStatusCode(this, statusCode);
      }
    }
  }
  finishRequest() {
    this.recordTimingMetric(TimingMetric.requestEnd);
    this.adapter.visitRequestFinished(this);
  }
  loadResponse() {
    if (this.response) {
      const { statusCode, responseHTML } = this.response;
      this.render(async () => {
        if (this.shouldCacheSnapshot)
          this.cacheSnapshot();
        if (this.view.renderPromise)
          await this.view.renderPromise;
        if (isSuccessful(statusCode) && responseHTML != null) {
          const snapshot = PageSnapshot.fromHTMLString(responseHTML);
          await this.renderPageSnapshot(snapshot, false);
          this.adapter.visitRendered(this);
          this.complete();
        } else {
          await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML), this);
          this.adapter.visitRendered(this);
          this.fail();
        }
      });
    }
  }
  getCachedSnapshot() {
    const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot();
    if (snapshot && (!getAnchor(this.location) || snapshot.hasAnchor(getAnchor(this.location)))) {
      if (this.action == "restore" || snapshot.isPreviewable) {
        return snapshot;
      }
    }
  }
  getPreloadedSnapshot() {
    if (this.snapshotHTML) {
      return PageSnapshot.fromHTMLString(this.snapshotHTML);
    }
  }
  hasCachedSnapshot() {
    return this.getCachedSnapshot() != null;
  }
  loadCachedSnapshot() {
    const snapshot = this.getCachedSnapshot();
    if (snapshot) {
      const isPreview = this.shouldIssueRequest();
      this.render(async () => {
        this.cacheSnapshot();
        if (this.isSamePage) {
          this.adapter.visitRendered(this);
        } else {
          if (this.view.renderPromise)
            await this.view.renderPromise;
          await this.renderPageSnapshot(snapshot, isPreview);
          this.adapter.visitRendered(this);
          if (!isPreview) {
            this.complete();
          }
        }
      });
    }
  }
  followRedirect() {
    if (this.redirectedToLocation && !this.followedRedirect && this.response?.redirected) {
      this.adapter.visitProposedToLocation(this.redirectedToLocation, {
        action: "replace",
        response: this.response,
        shouldCacheSnapshot: false,
        willRender: false
      });
      this.followedRedirect = true;
    }
  }
  goToSamePageAnchor() {
    if (this.isSamePage) {
      this.render(async () => {
        this.cacheSnapshot();
        this.performScroll();
        this.changeHistory();
        this.adapter.visitRendered(this);
      });
    }
  }
  // Fetch request delegate
  prepareRequest(request) {
    if (this.acceptsStreamResponse) {
      request.acceptResponseType(StreamMessage.contentType);
    }
  }
  requestStarted() {
    this.startRequest();
  }
  requestPreventedHandlingResponse(_request, _response) {
  }
  async requestSucceededWithResponse(request, response) {
    const responseHTML = await response.responseHTML;
    const { redirected, statusCode } = response;
    if (responseHTML == void 0) {
      this.recordResponse({
        statusCode: SystemStatusCode.contentTypeMismatch,
        redirected
      });
    } else {
      this.redirectedToLocation = response.redirected ? response.location : void 0;
      this.recordResponse({ statusCode, responseHTML, redirected });
    }
  }
  async requestFailedWithResponse(request, response) {
    const responseHTML = await response.responseHTML;
    const { redirected, statusCode } = response;
    if (responseHTML == void 0) {
      this.recordResponse({
        statusCode: SystemStatusCode.contentTypeMismatch,
        redirected
      });
    } else {
      this.recordResponse({ statusCode, responseHTML, redirected });
    }
  }
  requestErrored(_request, _error) {
    this.recordResponse({
      statusCode: SystemStatusCode.networkFailure,
      redirected: false
    });
  }
  requestFinished() {
    this.finishRequest();
  }
  // Scrolling
  performScroll() {
    if (!this.scrolled && !this.view.forceReloaded && !this.view.shouldPreserveScrollPosition(this)) {
      if (this.action == "restore") {
        this.scrollToRestoredPosition() || this.scrollToAnchor() || this.view.scrollToTop();
      } else {
        this.scrollToAnchor() || this.view.scrollToTop();
      }
      if (this.isSamePage) {
        this.delegate.visitScrolledToSamePageLocation(this.view.lastRenderedLocation, this.location);
      }
      this.scrolled = true;
    }
  }
  scrollToRestoredPosition() {
    const { scrollPosition } = this.restorationData;
    if (scrollPosition) {
      this.view.scrollToPosition(scrollPosition);
      return true;
    }
  }
  scrollToAnchor() {
    const anchor = getAnchor(this.location);
    if (anchor != null) {
      this.view.scrollToAnchor(anchor);
      return true;
    }
  }
  // Instrumentation
  recordTimingMetric(metric) {
    this.timingMetrics[metric] = (/* @__PURE__ */ new Date()).getTime();
  }
  getTimingMetrics() {
    return { ...this.timingMetrics };
  }
  // Private
  getHistoryMethodForAction(action) {
    switch (action) {
      case "replace":
        return history.replaceState;
      case "advance":
      case "restore":
        return history.pushState;
    }
  }
  hasPreloadedResponse() {
    return typeof this.response == "object";
  }
  shouldIssueRequest() {
    if (this.isSamePage) {
      return false;
    } else if (this.action == "restore") {
      return !this.hasCachedSnapshot();
    } else {
      return this.willRender;
    }
  }
  cacheSnapshot() {
    if (!this.snapshotCached) {
      this.view.cacheSnapshot(this.snapshot).then((snapshot) => snapshot && this.visitCachedSnapshot(snapshot));
      this.snapshotCached = true;
    }
  }
  async render(callback) {
    this.cancelRender();
    this.frame = await nextRepaint();
    await callback();
    delete this.frame;
  }
  async renderPageSnapshot(snapshot, isPreview) {
    await this.viewTransitioner.renderChange(this.view.shouldTransitionTo(snapshot), async () => {
      await this.view.renderPage(snapshot, isPreview, this.willRender, this);
      this.performScroll();
    });
  }
  cancelRender() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      delete this.frame;
    }
  }
};
function isSuccessful(statusCode) {
  return statusCode >= 200 && statusCode < 300;
}
var BrowserAdapter = class {
  progressBar = new ProgressBar();
  constructor(session2) {
    this.session = session2;
  }
  visitProposedToLocation(location2, options) {
    if (locationIsVisitable(location2, this.navigator.rootLocation)) {
      this.navigator.startVisit(location2, options?.restorationIdentifier || uuid(), options);
    } else {
      window.location.href = location2.toString();
    }
  }
  visitStarted(visit2) {
    this.location = visit2.location;
    visit2.loadCachedSnapshot();
    visit2.issueRequest();
    visit2.goToSamePageAnchor();
  }
  visitRequestStarted(visit2) {
    this.progressBar.setValue(0);
    if (visit2.hasCachedSnapshot() || visit2.action != "restore") {
      this.showVisitProgressBarAfterDelay();
    } else {
      this.showProgressBar();
    }
  }
  visitRequestCompleted(visit2) {
    visit2.loadResponse();
  }
  visitRequestFailedWithStatusCode(visit2, statusCode) {
    switch (statusCode) {
      case SystemStatusCode.networkFailure:
      case SystemStatusCode.timeoutFailure:
      case SystemStatusCode.contentTypeMismatch:
        return this.reload({
          reason: "request_failed",
          context: {
            statusCode
          }
        });
      default:
        return visit2.loadResponse();
    }
  }
  visitRequestFinished(_visit) {
  }
  visitCompleted(_visit) {
    this.progressBar.setValue(1);
    this.hideVisitProgressBar();
  }
  pageInvalidated(reason) {
    this.reload(reason);
  }
  visitFailed(_visit) {
    this.progressBar.setValue(1);
    this.hideVisitProgressBar();
  }
  visitRendered(_visit) {
  }
  // Form Submission Delegate
  formSubmissionStarted(_formSubmission) {
    this.progressBar.setValue(0);
    this.showFormProgressBarAfterDelay();
  }
  formSubmissionFinished(_formSubmission) {
    this.progressBar.setValue(1);
    this.hideFormProgressBar();
  }
  // Private
  showVisitProgressBarAfterDelay() {
    this.visitProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
  }
  hideVisitProgressBar() {
    this.progressBar.hide();
    if (this.visitProgressBarTimeout != null) {
      window.clearTimeout(this.visitProgressBarTimeout);
      delete this.visitProgressBarTimeout;
    }
  }
  showFormProgressBarAfterDelay() {
    if (this.formProgressBarTimeout == null) {
      this.formProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
    }
  }
  hideFormProgressBar() {
    this.progressBar.hide();
    if (this.formProgressBarTimeout != null) {
      window.clearTimeout(this.formProgressBarTimeout);
      delete this.formProgressBarTimeout;
    }
  }
  showProgressBar = () => {
    this.progressBar.show();
  };
  reload(reason) {
    dispatch("turbo:reload", { detail: reason });
    window.location.href = this.location?.toString() || window.location.href;
  }
  get navigator() {
    return this.session.navigator;
  }
};
var CacheObserver = class {
  selector = "[data-turbo-temporary]";
  deprecatedSelector = "[data-turbo-cache=false]";
  started = false;
  start() {
    if (!this.started) {
      this.started = true;
      addEventListener("turbo:before-cache", this.removeTemporaryElements, false);
    }
  }
  stop() {
    if (this.started) {
      this.started = false;
      removeEventListener("turbo:before-cache", this.removeTemporaryElements, false);
    }
  }
  removeTemporaryElements = (_event) => {
    for (const element of this.temporaryElements) {
      element.remove();
    }
  };
  get temporaryElements() {
    return [...document.querySelectorAll(this.selector), ...this.temporaryElementsWithDeprecation];
  }
  get temporaryElementsWithDeprecation() {
    const elements = document.querySelectorAll(this.deprecatedSelector);
    if (elements.length) {
      console.warn(
        `The ${this.deprecatedSelector} selector is deprecated and will be removed in a future version. Use ${this.selector} instead.`
      );
    }
    return [...elements];
  }
};
var FrameRedirector = class {
  constructor(session2, element) {
    this.session = session2;
    this.element = element;
    this.linkInterceptor = new LinkInterceptor(this, element);
    this.formSubmitObserver = new FormSubmitObserver(this, element);
  }
  start() {
    this.linkInterceptor.start();
    this.formSubmitObserver.start();
  }
  stop() {
    this.linkInterceptor.stop();
    this.formSubmitObserver.stop();
  }
  // Link interceptor delegate
  shouldInterceptLinkClick(element, _location, _event) {
    return this.#shouldRedirect(element);
  }
  linkClickIntercepted(element, url, event) {
    const frame = this.#findFrameElement(element);
    if (frame) {
      frame.delegate.linkClickIntercepted(element, url, event);
    }
  }
  // Form submit observer delegate
  willSubmitForm(element, submitter) {
    return element.closest("turbo-frame") == null && this.#shouldSubmit(element, submitter) && this.#shouldRedirect(element, submitter);
  }
  formSubmitted(element, submitter) {
    const frame = this.#findFrameElement(element, submitter);
    if (frame) {
      frame.delegate.formSubmitted(element, submitter);
    }
  }
  #shouldSubmit(form, submitter) {
    const action = getAction$1(form, submitter);
    const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
    const rootLocation = expandURL(meta?.content ?? "/");
    return this.#shouldRedirect(form, submitter) && locationIsVisitable(action, rootLocation);
  }
  #shouldRedirect(element, submitter) {
    const isNavigatable = element instanceof HTMLFormElement ? this.session.submissionIsNavigatable(element, submitter) : this.session.elementIsNavigatable(element);
    if (isNavigatable) {
      const frame = this.#findFrameElement(element, submitter);
      return frame ? frame != element.closest("turbo-frame") : false;
    } else {
      return false;
    }
  }
  #findFrameElement(element, submitter) {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame");
    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`);
      if (frame instanceof FrameElement) {
        return frame;
      }
    }
  }
};
var History = class {
  location;
  restorationIdentifier = uuid();
  restorationData = {};
  started = false;
  pageLoaded = false;
  currentIndex = 0;
  constructor(delegate) {
    this.delegate = delegate;
  }
  start() {
    if (!this.started) {
      addEventListener("popstate", this.onPopState, false);
      addEventListener("load", this.onPageLoad, false);
      this.currentIndex = history.state?.turbo?.restorationIndex || 0;
      this.started = true;
      this.replace(new URL(window.location.href));
    }
  }
  stop() {
    if (this.started) {
      removeEventListener("popstate", this.onPopState, false);
      removeEventListener("load", this.onPageLoad, false);
      this.started = false;
    }
  }
  push(location2, restorationIdentifier) {
    this.update(history.pushState, location2, restorationIdentifier);
  }
  replace(location2, restorationIdentifier) {
    this.update(history.replaceState, location2, restorationIdentifier);
  }
  update(method, location2, restorationIdentifier = uuid()) {
    if (method === history.pushState)
      ++this.currentIndex;
    const state = { turbo: { restorationIdentifier, restorationIndex: this.currentIndex } };
    method.call(history, state, "", location2.href);
    this.location = location2;
    this.restorationIdentifier = restorationIdentifier;
  }
  // Restoration data
  getRestorationDataForIdentifier(restorationIdentifier) {
    return this.restorationData[restorationIdentifier] || {};
  }
  updateRestorationData(additionalData) {
    const { restorationIdentifier } = this;
    const restorationData = this.restorationData[restorationIdentifier];
    this.restorationData[restorationIdentifier] = {
      ...restorationData,
      ...additionalData
    };
  }
  // Scroll restoration
  assumeControlOfScrollRestoration() {
    if (!this.previousScrollRestoration) {
      this.previousScrollRestoration = history.scrollRestoration ?? "auto";
      history.scrollRestoration = "manual";
    }
  }
  relinquishControlOfScrollRestoration() {
    if (this.previousScrollRestoration) {
      history.scrollRestoration = this.previousScrollRestoration;
      delete this.previousScrollRestoration;
    }
  }
  // Event handlers
  onPopState = (event) => {
    if (this.shouldHandlePopState()) {
      const { turbo } = event.state || {};
      if (turbo) {
        this.location = new URL(window.location.href);
        const { restorationIdentifier, restorationIndex } = turbo;
        this.restorationIdentifier = restorationIdentifier;
        const direction = restorationIndex > this.currentIndex ? "forward" : "back";
        this.delegate.historyPoppedToLocationWithRestorationIdentifierAndDirection(this.location, restorationIdentifier, direction);
        this.currentIndex = restorationIndex;
      }
    }
  };
  onPageLoad = async (_event) => {
    await nextMicrotask();
    this.pageLoaded = true;
  };
  // Private
  shouldHandlePopState() {
    return this.pageIsLoaded();
  }
  pageIsLoaded() {
    return this.pageLoaded || document.readyState == "complete";
  }
};
var Navigator = class {
  constructor(delegate) {
    this.delegate = delegate;
  }
  proposeVisit(location2, options = {}) {
    if (this.delegate.allowsVisitingLocationWithAction(location2, options.action)) {
      this.delegate.visitProposedToLocation(location2, options);
    }
  }
  startVisit(locatable, restorationIdentifier, options = {}) {
    this.stop();
    this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, {
      referrer: this.location,
      ...options
    });
    this.currentVisit.start();
  }
  submitForm(form, submitter) {
    this.stop();
    this.formSubmission = new FormSubmission(this, form, submitter, true);
    this.formSubmission.start();
  }
  stop() {
    if (this.formSubmission) {
      this.formSubmission.stop();
      delete this.formSubmission;
    }
    if (this.currentVisit) {
      this.currentVisit.cancel();
      delete this.currentVisit;
    }
  }
  get adapter() {
    return this.delegate.adapter;
  }
  get view() {
    return this.delegate.view;
  }
  get rootLocation() {
    return this.view.snapshot.rootLocation;
  }
  get history() {
    return this.delegate.history;
  }
  // Form submission delegate
  formSubmissionStarted(formSubmission) {
    if (typeof this.adapter.formSubmissionStarted === "function") {
      this.adapter.formSubmissionStarted(formSubmission);
    }
  }
  async formSubmissionSucceededWithResponse(formSubmission, fetchResponse) {
    if (formSubmission == this.formSubmission) {
      const responseHTML = await fetchResponse.responseHTML;
      if (responseHTML) {
        const shouldCacheSnapshot = formSubmission.isSafe;
        if (!shouldCacheSnapshot) {
          this.view.clearSnapshotCache();
        }
        const { statusCode, redirected } = fetchResponse;
        const action = this.#getActionForFormSubmission(formSubmission, fetchResponse);
        const visitOptions = {
          action,
          shouldCacheSnapshot,
          response: { statusCode, responseHTML, redirected }
        };
        this.proposeVisit(fetchResponse.location, visitOptions);
      }
    }
  }
  async formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
    const responseHTML = await fetchResponse.responseHTML;
    if (responseHTML) {
      const snapshot = PageSnapshot.fromHTMLString(responseHTML);
      if (fetchResponse.serverError) {
        await this.view.renderError(snapshot, this.currentVisit);
      } else {
        await this.view.renderPage(snapshot, false, true, this.currentVisit);
      }
      if (!snapshot.shouldPreserveScrollPosition) {
        this.view.scrollToTop();
      }
      this.view.clearSnapshotCache();
    }
  }
  formSubmissionErrored(formSubmission, error) {
    console.error(error);
  }
  formSubmissionFinished(formSubmission) {
    if (typeof this.adapter.formSubmissionFinished === "function") {
      this.adapter.formSubmissionFinished(formSubmission);
    }
  }
  // Visit delegate
  visitStarted(visit2) {
    this.delegate.visitStarted(visit2);
  }
  visitCompleted(visit2) {
    this.delegate.visitCompleted(visit2);
  }
  locationWithActionIsSamePage(location2, action) {
    const anchor = getAnchor(location2);
    const currentAnchor = getAnchor(this.view.lastRenderedLocation);
    const isRestorationToTop = action === "restore" && typeof anchor === "undefined";
    return action !== "replace" && getRequestURL(location2) === getRequestURL(this.view.lastRenderedLocation) && (isRestorationToTop || anchor != null && anchor !== currentAnchor);
  }
  visitScrolledToSamePageLocation(oldURL, newURL) {
    this.delegate.visitScrolledToSamePageLocation(oldURL, newURL);
  }
  // Visits
  get location() {
    return this.history.location;
  }
  get restorationIdentifier() {
    return this.history.restorationIdentifier;
  }
  #getActionForFormSubmission(formSubmission, fetchResponse) {
    const { submitter, formElement } = formSubmission;
    return getVisitAction(submitter, formElement) || this.#getDefaultAction(fetchResponse);
  }
  #getDefaultAction(fetchResponse) {
    const sameLocationRedirect = fetchResponse.redirected && fetchResponse.location.href === this.location?.href;
    return sameLocationRedirect ? "replace" : "advance";
  }
};
var PageStage = {
  initial: 0,
  loading: 1,
  interactive: 2,
  complete: 3
};
var PageObserver = class {
  stage = PageStage.initial;
  started = false;
  constructor(delegate) {
    this.delegate = delegate;
  }
  start() {
    if (!this.started) {
      if (this.stage == PageStage.initial) {
        this.stage = PageStage.loading;
      }
      document.addEventListener("readystatechange", this.interpretReadyState, false);
      addEventListener("pagehide", this.pageWillUnload, false);
      this.started = true;
    }
  }
  stop() {
    if (this.started) {
      document.removeEventListener("readystatechange", this.interpretReadyState, false);
      removeEventListener("pagehide", this.pageWillUnload, false);
      this.started = false;
    }
  }
  interpretReadyState = () => {
    const { readyState } = this;
    if (readyState == "interactive") {
      this.pageIsInteractive();
    } else if (readyState == "complete") {
      this.pageIsComplete();
    }
  };
  pageIsInteractive() {
    if (this.stage == PageStage.loading) {
      this.stage = PageStage.interactive;
      this.delegate.pageBecameInteractive();
    }
  }
  pageIsComplete() {
    this.pageIsInteractive();
    if (this.stage == PageStage.interactive) {
      this.stage = PageStage.complete;
      this.delegate.pageLoaded();
    }
  }
  pageWillUnload = () => {
    this.delegate.pageWillUnload();
  };
  get readyState() {
    return document.readyState;
  }
};
var ScrollObserver = class {
  started = false;
  constructor(delegate) {
    this.delegate = delegate;
  }
  start() {
    if (!this.started) {
      addEventListener("scroll", this.onScroll, false);
      this.onScroll();
      this.started = true;
    }
  }
  stop() {
    if (this.started) {
      removeEventListener("scroll", this.onScroll, false);
      this.started = false;
    }
  }
  onScroll = () => {
    this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset });
  };
  // Private
  updatePosition(position) {
    this.delegate.scrollPositionChanged(position);
  }
};
var StreamMessageRenderer = class {
  render({ fragment }) {
    Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () => {
      withAutofocusFromFragment(fragment, () => {
        withPreservedFocus(() => {
          document.documentElement.appendChild(fragment);
        });
      });
    });
  }
  // Bardo delegate
  enteringBardo(currentPermanentElement, newPermanentElement) {
    newPermanentElement.replaceWith(currentPermanentElement.cloneNode(true));
  }
  leavingBardo() {
  }
};
function getPermanentElementMapForFragment(fragment) {
  const permanentElementsInDocument = queryPermanentElementsAll(document.documentElement);
  const permanentElementMap = {};
  for (const permanentElementInDocument of permanentElementsInDocument) {
    const { id } = permanentElementInDocument;
    for (const streamElement of fragment.querySelectorAll("turbo-stream")) {
      const elementInStream = getPermanentElementById(streamElement.templateElement.content, id);
      if (elementInStream) {
        permanentElementMap[id] = [permanentElementInDocument, elementInStream];
      }
    }
  }
  return permanentElementMap;
}
async function withAutofocusFromFragment(fragment, callback) {
  const generatedID = `turbo-stream-autofocus-${uuid()}`;
  const turboStreams = fragment.querySelectorAll("turbo-stream");
  const elementWithAutofocus = firstAutofocusableElementInStreams(turboStreams);
  let willAutofocusId = null;
  if (elementWithAutofocus) {
    if (elementWithAutofocus.id) {
      willAutofocusId = elementWithAutofocus.id;
    } else {
      willAutofocusId = generatedID;
    }
    elementWithAutofocus.id = willAutofocusId;
  }
  callback();
  await nextRepaint();
  const hasNoActiveElement = document.activeElement == null || document.activeElement == document.body;
  if (hasNoActiveElement && willAutofocusId) {
    const elementToAutofocus = document.getElementById(willAutofocusId);
    if (elementIsFocusable(elementToAutofocus)) {
      elementToAutofocus.focus();
    }
    if (elementToAutofocus && elementToAutofocus.id == generatedID) {
      elementToAutofocus.removeAttribute("id");
    }
  }
}
async function withPreservedFocus(callback) {
  const [activeElementBeforeRender, activeElementAfterRender] = await around(callback, () => document.activeElement);
  const restoreFocusTo = activeElementBeforeRender && activeElementBeforeRender.id;
  if (restoreFocusTo) {
    const elementToFocus = document.getElementById(restoreFocusTo);
    if (elementIsFocusable(elementToFocus) && elementToFocus != activeElementAfterRender) {
      elementToFocus.focus();
    }
  }
}
function firstAutofocusableElementInStreams(nodeListOfStreamElements) {
  for (const streamElement of nodeListOfStreamElements) {
    const elementWithAutofocus = queryAutofocusableElement(streamElement.templateElement.content);
    if (elementWithAutofocus)
      return elementWithAutofocus;
  }
  return null;
}
var StreamObserver = class {
  sources = /* @__PURE__ */ new Set();
  #started = false;
  constructor(delegate) {
    this.delegate = delegate;
  }
  start() {
    if (!this.#started) {
      this.#started = true;
      addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
    }
  }
  stop() {
    if (this.#started) {
      this.#started = false;
      removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
    }
  }
  connectStreamSource(source) {
    if (!this.streamSourceIsConnected(source)) {
      this.sources.add(source);
      source.addEventListener("message", this.receiveMessageEvent, false);
    }
  }
  disconnectStreamSource(source) {
    if (this.streamSourceIsConnected(source)) {
      this.sources.delete(source);
      source.removeEventListener("message", this.receiveMessageEvent, false);
    }
  }
  streamSourceIsConnected(source) {
    return this.sources.has(source);
  }
  inspectFetchResponse = (event) => {
    const response = fetchResponseFromEvent(event);
    if (response && fetchResponseIsStream(response)) {
      event.preventDefault();
      this.receiveMessageResponse(response);
    }
  };
  receiveMessageEvent = (event) => {
    if (this.#started && typeof event.data == "string") {
      this.receiveMessageHTML(event.data);
    }
  };
  async receiveMessageResponse(response) {
    const html = await response.responseHTML;
    if (html) {
      this.receiveMessageHTML(html);
    }
  }
  receiveMessageHTML(html) {
    this.delegate.receivedMessageFromStream(StreamMessage.wrap(html));
  }
};
function fetchResponseFromEvent(event) {
  const fetchResponse = event.detail?.fetchResponse;
  if (fetchResponse instanceof FetchResponse) {
    return fetchResponse;
  }
}
function fetchResponseIsStream(response) {
  const contentType = response.contentType ?? "";
  return contentType.startsWith(StreamMessage.contentType);
}
var ErrorRenderer = class extends Renderer {
  static renderElement(currentElement, newElement) {
    const { documentElement, body } = document;
    documentElement.replaceChild(newElement, body);
  }
  async render() {
    this.replaceHeadAndBody();
    this.activateScriptElements();
  }
  replaceHeadAndBody() {
    const { documentElement, head } = document;
    documentElement.replaceChild(this.newHead, head);
    this.renderElement(this.currentElement, this.newElement);
  }
  activateScriptElements() {
    for (const replaceableElement of this.scriptElements) {
      const parentNode = replaceableElement.parentNode;
      if (parentNode) {
        const element = activateScriptElement(replaceableElement);
        parentNode.replaceChild(element, replaceableElement);
      }
    }
  }
  get newHead() {
    return this.newSnapshot.headSnapshot.element;
  }
  get scriptElements() {
    return document.documentElement.querySelectorAll("script");
  }
};
var EMPTY_SET = /* @__PURE__ */ new Set();
function morph(oldNode, newContent, config = {}) {
  if (oldNode instanceof Document) {
    oldNode = oldNode.documentElement;
  }
  if (typeof newContent === "string") {
    newContent = parseContent(newContent);
  }
  let normalizedContent = normalizeContent(newContent);
  let ctx = createMorphContext(oldNode, normalizedContent, config);
  return morphNormalizedContent(oldNode, normalizedContent, ctx);
}
function morphNormalizedContent(oldNode, normalizedNewContent, ctx) {
  if (ctx.head.block) {
    let oldHead = oldNode.querySelector("head");
    let newHead = normalizedNewContent.querySelector("head");
    if (oldHead && newHead) {
      let promises = handleHeadElement(newHead, oldHead, ctx);
      Promise.all(promises).then(function() {
        morphNormalizedContent(oldNode, normalizedNewContent, Object.assign(ctx, {
          head: {
            block: false,
            ignore: true
          }
        }));
      });
      return;
    }
  }
  if (ctx.morphStyle === "innerHTML") {
    morphChildren(normalizedNewContent, oldNode, ctx);
    return oldNode.children;
  } else if (ctx.morphStyle === "outerHTML" || ctx.morphStyle == null) {
    let bestMatch = findBestNodeMatch(normalizedNewContent, oldNode, ctx);
    let previousSibling = bestMatch?.previousSibling;
    let nextSibling = bestMatch?.nextSibling;
    let morphedNode = morphOldNodeTo(oldNode, bestMatch, ctx);
    if (bestMatch) {
      return insertSiblings(previousSibling, morphedNode, nextSibling);
    } else {
      return [];
    }
  } else {
    throw "Do not understand how to morph style " + ctx.morphStyle;
  }
}
function morphOldNodeTo(oldNode, newContent, ctx) {
  if (ctx.ignoreActive && oldNode === document.activeElement)
    ;
  else if (newContent == null) {
    if (ctx.callbacks.beforeNodeRemoved(oldNode) === false)
      return;
    oldNode.remove();
    ctx.callbacks.afterNodeRemoved(oldNode);
    return null;
  } else if (!isSoftMatch(oldNode, newContent)) {
    if (ctx.callbacks.beforeNodeRemoved(oldNode) === false)
      return;
    if (ctx.callbacks.beforeNodeAdded(newContent) === false)
      return;
    oldNode.parentElement.replaceChild(newContent, oldNode);
    ctx.callbacks.afterNodeAdded(newContent);
    ctx.callbacks.afterNodeRemoved(oldNode);
    return newContent;
  } else {
    if (ctx.callbacks.beforeNodeMorphed(oldNode, newContent) === false)
      return;
    if (oldNode instanceof HTMLHeadElement && ctx.head.ignore)
      ;
    else if (oldNode instanceof HTMLHeadElement && ctx.head.style !== "morph") {
      handleHeadElement(newContent, oldNode, ctx);
    } else {
      syncNodeFrom(newContent, oldNode);
      morphChildren(newContent, oldNode, ctx);
    }
    ctx.callbacks.afterNodeMorphed(oldNode, newContent);
    return oldNode;
  }
}
function morphChildren(newParent, oldParent, ctx) {
  let nextNewChild = newParent.firstChild;
  let insertionPoint = oldParent.firstChild;
  let newChild;
  while (nextNewChild) {
    newChild = nextNewChild;
    nextNewChild = newChild.nextSibling;
    if (insertionPoint == null) {
      if (ctx.callbacks.beforeNodeAdded(newChild) === false)
        return;
      oldParent.appendChild(newChild);
      ctx.callbacks.afterNodeAdded(newChild);
      removeIdsFromConsideration(ctx, newChild);
      continue;
    }
    if (isIdSetMatch(newChild, insertionPoint, ctx)) {
      morphOldNodeTo(insertionPoint, newChild, ctx);
      insertionPoint = insertionPoint.nextSibling;
      removeIdsFromConsideration(ctx, newChild);
      continue;
    }
    let idSetMatch = findIdSetMatch(newParent, oldParent, newChild, insertionPoint, ctx);
    if (idSetMatch) {
      insertionPoint = removeNodesBetween(insertionPoint, idSetMatch, ctx);
      morphOldNodeTo(idSetMatch, newChild, ctx);
      removeIdsFromConsideration(ctx, newChild);
      continue;
    }
    let softMatch = findSoftMatch(newParent, oldParent, newChild, insertionPoint, ctx);
    if (softMatch) {
      insertionPoint = removeNodesBetween(insertionPoint, softMatch, ctx);
      morphOldNodeTo(softMatch, newChild, ctx);
      removeIdsFromConsideration(ctx, newChild);
      continue;
    }
    if (ctx.callbacks.beforeNodeAdded(newChild) === false)
      return;
    oldParent.insertBefore(newChild, insertionPoint);
    ctx.callbacks.afterNodeAdded(newChild);
    removeIdsFromConsideration(ctx, newChild);
  }
  while (insertionPoint !== null) {
    let tempNode = insertionPoint;
    insertionPoint = insertionPoint.nextSibling;
    removeNode(tempNode, ctx);
  }
}
function syncNodeFrom(from, to) {
  let type = from.nodeType;
  if (type === 1) {
    const fromAttributes = from.attributes;
    const toAttributes = to.attributes;
    for (const fromAttribute of fromAttributes) {
      if (to.getAttribute(fromAttribute.name) !== fromAttribute.value) {
        to.setAttribute(fromAttribute.name, fromAttribute.value);
      }
    }
    for (const toAttribute of toAttributes) {
      if (!from.hasAttribute(toAttribute.name)) {
        to.removeAttribute(toAttribute.name);
      }
    }
  }
  if (type === 8 || type === 3) {
    if (to.nodeValue !== from.nodeValue) {
      to.nodeValue = from.nodeValue;
    }
  }
  if (from instanceof HTMLInputElement && to instanceof HTMLInputElement && from.type !== "file") {
    to.value = from.value || "";
    syncAttribute(from, to, "value");
    syncAttribute(from, to, "checked");
    syncAttribute(from, to, "disabled");
  } else if (from instanceof HTMLOptionElement) {
    syncAttribute(from, to, "selected");
  } else if (from instanceof HTMLTextAreaElement && to instanceof HTMLTextAreaElement) {
    let fromValue = from.value;
    let toValue = to.value;
    if (fromValue !== toValue) {
      to.value = fromValue;
    }
    if (to.firstChild && to.firstChild.nodeValue !== fromValue) {
      to.firstChild.nodeValue = fromValue;
    }
  }
}
function syncAttribute(from, to, attributeName) {
  if (from[attributeName] !== to[attributeName]) {
    if (from[attributeName]) {
      to.setAttribute(attributeName, from[attributeName]);
    } else {
      to.removeAttribute(attributeName);
    }
  }
}
function handleHeadElement(newHeadTag, currentHead, ctx) {
  let added = [];
  let removed = [];
  let preserved = [];
  let nodesToAppend = [];
  let headMergeStyle = ctx.head.style;
  let srcToNewHeadNodes = /* @__PURE__ */ new Map();
  for (const newHeadChild of newHeadTag.children) {
    srcToNewHeadNodes.set(newHeadChild.outerHTML, newHeadChild);
  }
  for (const currentHeadElt of currentHead.children) {
    let inNewContent = srcToNewHeadNodes.has(currentHeadElt.outerHTML);
    let isReAppended = ctx.head.shouldReAppend(currentHeadElt);
    let isPreserved = ctx.head.shouldPreserve(currentHeadElt);
    if (inNewContent || isPreserved) {
      if (isReAppended) {
        removed.push(currentHeadElt);
      } else {
        srcToNewHeadNodes.delete(currentHeadElt.outerHTML);
        preserved.push(currentHeadElt);
      }
    } else {
      if (headMergeStyle === "append") {
        if (isReAppended) {
          removed.push(currentHeadElt);
          nodesToAppend.push(currentHeadElt);
        }
      } else {
        if (ctx.head.shouldRemove(currentHeadElt) !== false) {
          removed.push(currentHeadElt);
        }
      }
    }
  }
  nodesToAppend.push(...srcToNewHeadNodes.values());
  let promises = [];
  for (const newNode of nodesToAppend) {
    let newElt = document.createRange().createContextualFragment(newNode.outerHTML).firstChild;
    if (ctx.callbacks.beforeNodeAdded(newElt) !== false) {
      if (newElt.href || newElt.src) {
        let resolve = null;
        let promise = new Promise(function(_resolve) {
          resolve = _resolve;
        });
        newElt.addEventListener("load", function() {
          resolve();
        });
        promises.push(promise);
      }
      currentHead.appendChild(newElt);
      ctx.callbacks.afterNodeAdded(newElt);
      added.push(newElt);
    }
  }
  for (const removedElement of removed) {
    if (ctx.callbacks.beforeNodeRemoved(removedElement) !== false) {
      currentHead.removeChild(removedElement);
      ctx.callbacks.afterNodeRemoved(removedElement);
    }
  }
  ctx.head.afterHeadMorphed(currentHead, { added, kept: preserved, removed });
  return promises;
}
function noOp() {
}
function createMorphContext(oldNode, newContent, config) {
  return {
    target: oldNode,
    newContent,
    config,
    morphStyle: config.morphStyle,
    ignoreActive: config.ignoreActive,
    idMap: createIdMap(oldNode, newContent),
    deadIds: /* @__PURE__ */ new Set(),
    callbacks: Object.assign({
      beforeNodeAdded: noOp,
      afterNodeAdded: noOp,
      beforeNodeMorphed: noOp,
      afterNodeMorphed: noOp,
      beforeNodeRemoved: noOp,
      afterNodeRemoved: noOp
    }, config.callbacks),
    head: Object.assign({
      style: "merge",
      shouldPreserve: function(elt) {
        return elt.getAttribute("im-preserve") === "true";
      },
      shouldReAppend: function(elt) {
        return elt.getAttribute("im-re-append") === "true";
      },
      shouldRemove: noOp,
      afterHeadMorphed: noOp
    }, config.head)
  };
}
function isIdSetMatch(node1, node2, ctx) {
  if (node1 == null || node2 == null) {
    return false;
  }
  if (node1.nodeType === node2.nodeType && node1.tagName === node2.tagName) {
    if (node1.id !== "" && node1.id === node2.id) {
      return true;
    } else {
      return getIdIntersectionCount(ctx, node1, node2) > 0;
    }
  }
  return false;
}
function isSoftMatch(node1, node2) {
  if (node1 == null || node2 == null) {
    return false;
  }
  return node1.nodeType === node2.nodeType && node1.tagName === node2.tagName;
}
function removeNodesBetween(startInclusive, endExclusive, ctx) {
  while (startInclusive !== endExclusive) {
    let tempNode = startInclusive;
    startInclusive = startInclusive.nextSibling;
    removeNode(tempNode, ctx);
  }
  removeIdsFromConsideration(ctx, endExclusive);
  return endExclusive.nextSibling;
}
function findIdSetMatch(newContent, oldParent, newChild, insertionPoint, ctx) {
  let newChildPotentialIdCount = getIdIntersectionCount(ctx, newChild, oldParent);
  let potentialMatch = null;
  if (newChildPotentialIdCount > 0) {
    let potentialMatch2 = insertionPoint;
    let otherMatchCount = 0;
    while (potentialMatch2 != null) {
      if (isIdSetMatch(newChild, potentialMatch2, ctx)) {
        return potentialMatch2;
      }
      otherMatchCount += getIdIntersectionCount(ctx, potentialMatch2, newContent);
      if (otherMatchCount > newChildPotentialIdCount) {
        return null;
      }
      potentialMatch2 = potentialMatch2.nextSibling;
    }
  }
  return potentialMatch;
}
function findSoftMatch(newContent, oldParent, newChild, insertionPoint, ctx) {
  let potentialSoftMatch = insertionPoint;
  let nextSibling = newChild.nextSibling;
  let siblingSoftMatchCount = 0;
  while (potentialSoftMatch != null) {
    if (getIdIntersectionCount(ctx, potentialSoftMatch, newContent) > 0) {
      return null;
    }
    if (isSoftMatch(newChild, potentialSoftMatch)) {
      return potentialSoftMatch;
    }
    if (isSoftMatch(nextSibling, potentialSoftMatch)) {
      siblingSoftMatchCount++;
      nextSibling = nextSibling.nextSibling;
      if (siblingSoftMatchCount >= 2) {
        return null;
      }
    }
    potentialSoftMatch = potentialSoftMatch.nextSibling;
  }
  return potentialSoftMatch;
}
function parseContent(newContent) {
  let parser = new DOMParser();
  let contentWithSvgsRemoved = newContent.replace(/<svg(\s[^>]*>|>)([\s\S]*?)<\/svg>/gim, "");
  if (contentWithSvgsRemoved.match(/<\/html>/) || contentWithSvgsRemoved.match(/<\/head>/) || contentWithSvgsRemoved.match(/<\/body>/)) {
    let content = parser.parseFromString(newContent, "text/html");
    if (contentWithSvgsRemoved.match(/<\/html>/)) {
      content.generatedByIdiomorph = true;
      return content;
    } else {
      let htmlElement = content.firstChild;
      if (htmlElement) {
        htmlElement.generatedByIdiomorph = true;
        return htmlElement;
      } else {
        return null;
      }
    }
  } else {
    let responseDoc = parser.parseFromString("<body><template>" + newContent + "</template></body>", "text/html");
    let content = responseDoc.body.querySelector("template").content;
    content.generatedByIdiomorph = true;
    return content;
  }
}
function normalizeContent(newContent) {
  if (newContent == null) {
    const dummyParent = document.createElement("div");
    return dummyParent;
  } else if (newContent.generatedByIdiomorph) {
    return newContent;
  } else if (newContent instanceof Node) {
    const dummyParent = document.createElement("div");
    dummyParent.append(newContent);
    return dummyParent;
  } else {
    const dummyParent = document.createElement("div");
    for (const elt of [...newContent]) {
      dummyParent.append(elt);
    }
    return dummyParent;
  }
}
function insertSiblings(previousSibling, morphedNode, nextSibling) {
  let stack = [];
  let added = [];
  while (previousSibling != null) {
    stack.push(previousSibling);
    previousSibling = previousSibling.previousSibling;
  }
  while (stack.length > 0) {
    let node = stack.pop();
    added.push(node);
    morphedNode.parentElement.insertBefore(node, morphedNode);
  }
  added.push(morphedNode);
  while (nextSibling != null) {
    stack.push(nextSibling);
    added.push(nextSibling);
    nextSibling = nextSibling.nextSibling;
  }
  while (stack.length > 0) {
    morphedNode.parentElement.insertBefore(stack.pop(), morphedNode.nextSibling);
  }
  return added;
}
function findBestNodeMatch(newContent, oldNode, ctx) {
  let currentElement;
  currentElement = newContent.firstChild;
  let bestElement = currentElement;
  let score = 0;
  while (currentElement) {
    let newScore = scoreElement(currentElement, oldNode, ctx);
    if (newScore > score) {
      bestElement = currentElement;
      score = newScore;
    }
    currentElement = currentElement.nextSibling;
  }
  return bestElement;
}
function scoreElement(node1, node2, ctx) {
  if (isSoftMatch(node1, node2)) {
    return 0.5 + getIdIntersectionCount(ctx, node1, node2);
  }
  return 0;
}
function removeNode(tempNode, ctx) {
  removeIdsFromConsideration(ctx, tempNode);
  if (ctx.callbacks.beforeNodeRemoved(tempNode) === false)
    return;
  tempNode.remove();
  ctx.callbacks.afterNodeRemoved(tempNode);
}
function isIdInConsideration(ctx, id) {
  return !ctx.deadIds.has(id);
}
function idIsWithinNode(ctx, id, targetNode) {
  let idSet = ctx.idMap.get(targetNode) || EMPTY_SET;
  return idSet.has(id);
}
function removeIdsFromConsideration(ctx, node) {
  let idSet = ctx.idMap.get(node) || EMPTY_SET;
  for (const id of idSet) {
    ctx.deadIds.add(id);
  }
}
function getIdIntersectionCount(ctx, node1, node2) {
  let sourceSet = ctx.idMap.get(node1) || EMPTY_SET;
  let matchCount = 0;
  for (const id of sourceSet) {
    if (isIdInConsideration(ctx, id) && idIsWithinNode(ctx, id, node2)) {
      ++matchCount;
    }
  }
  return matchCount;
}
function populateIdMapForNode(node, idMap) {
  let nodeParent = node.parentElement;
  let idElements = node.querySelectorAll("[id]");
  for (const elt of idElements) {
    let current = elt;
    while (current !== nodeParent && current != null) {
      let idSet = idMap.get(current);
      if (idSet == null) {
        idSet = /* @__PURE__ */ new Set();
        idMap.set(current, idSet);
      }
      idSet.add(elt.id);
      current = current.parentElement;
    }
  }
}
function createIdMap(oldContent, newContent) {
  let idMap = /* @__PURE__ */ new Map();
  populateIdMapForNode(oldContent, idMap);
  populateIdMapForNode(newContent, idMap);
  return idMap;
}
var idiomorph = { morph };
var MorphRenderer = class extends Renderer {
  async render() {
    if (this.willRender)
      await this.#morphBody();
  }
  get renderMethod() {
    return "morph";
  }
  // Private
  async #morphBody() {
    this.#morphElements(this.currentElement, this.newElement);
    this.#reloadRemoteFrames();
    dispatch("turbo:morph", {
      detail: {
        currentElement: this.currentElement,
        newElement: this.newElement
      }
    });
  }
  #morphElements(currentElement, newElement, morphStyle = "outerHTML") {
    this.isMorphingTurboFrame = this.#isFrameReloadedWithMorph(currentElement);
    idiomorph.morph(currentElement, newElement, {
      morphStyle,
      callbacks: {
        beforeNodeAdded: this.#shouldAddElement,
        beforeNodeMorphed: this.#shouldMorphElement,
        beforeNodeRemoved: this.#shouldRemoveElement
      }
    });
  }
  #shouldAddElement = (node) => {
    return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id));
  };
  #shouldMorphElement = (oldNode, newNode) => {
    if (oldNode instanceof HTMLElement) {
      return !oldNode.hasAttribute("data-turbo-permanent") && (this.isMorphingTurboFrame || !this.#isFrameReloadedWithMorph(oldNode));
    } else {
      return true;
    }
  };
  #shouldRemoveElement = (node) => {
    return this.#shouldMorphElement(node);
  };
  #reloadRemoteFrames() {
    this.#remoteFrames().forEach((frame) => {
      if (this.#isFrameReloadedWithMorph(frame)) {
        this.#renderFrameWithMorph(frame);
        frame.reload();
      }
    });
  }
  #renderFrameWithMorph(frame) {
    frame.addEventListener("turbo:before-frame-render", (event) => {
      event.detail.render = this.#morphFrameUpdate;
    }, { once: true });
  }
  #morphFrameUpdate = (currentElement, newElement) => {
    dispatch("turbo:before-frame-morph", {
      target: currentElement,
      detail: { currentElement, newElement }
    });
    this.#morphElements(currentElement, newElement.children, "innerHTML");
  };
  #isFrameReloadedWithMorph(element) {
    return element.src && element.refresh === "morph";
  }
  #remoteFrames() {
    return Array.from(document.querySelectorAll("turbo-frame[src]")).filter((frame) => {
      return !frame.closest("[data-turbo-permanent]");
    });
  }
};
var PageRenderer = class extends Renderer {
  static renderElement(currentElement, newElement) {
    if (document.body && newElement instanceof HTMLBodyElement) {
      document.body.replaceWith(newElement);
    } else {
      document.documentElement.appendChild(newElement);
    }
  }
  get shouldRender() {
    return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical;
  }
  get reloadReason() {
    if (!this.newSnapshot.isVisitable) {
      return {
        reason: "turbo_visit_control_is_reload"
      };
    }
    if (!this.trackedElementsAreIdentical) {
      return {
        reason: "tracked_element_mismatch"
      };
    }
  }
  async prepareToRender() {
    this.#setLanguage();
    await this.mergeHead();
  }
  async render() {
    if (this.willRender) {
      await this.replaceBody();
    }
  }
  finishRendering() {
    super.finishRendering();
    if (!this.isPreview) {
      this.focusFirstAutofocusableElement();
    }
  }
  get currentHeadSnapshot() {
    return this.currentSnapshot.headSnapshot;
  }
  get newHeadSnapshot() {
    return this.newSnapshot.headSnapshot;
  }
  get newElement() {
    return this.newSnapshot.element;
  }
  #setLanguage() {
    const { documentElement } = this.currentSnapshot;
    const { lang } = this.newSnapshot;
    if (lang) {
      documentElement.setAttribute("lang", lang);
    } else {
      documentElement.removeAttribute("lang");
    }
  }
  async mergeHead() {
    const mergedHeadElements = this.mergeProvisionalElements();
    const newStylesheetElements = this.copyNewHeadStylesheetElements();
    this.copyNewHeadScriptElements();
    await mergedHeadElements;
    await newStylesheetElements;
  }
  async replaceBody() {
    await this.preservingPermanentElements(async () => {
      this.activateNewBody();
      await this.assignNewBody();
    });
  }
  get trackedElementsAreIdentical() {
    return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature;
  }
  async copyNewHeadStylesheetElements() {
    const loadingElements = [];
    for (const element of this.newHeadStylesheetElements) {
      loadingElements.push(waitForLoad(element));
      document.head.appendChild(element);
    }
    await Promise.all(loadingElements);
  }
  copyNewHeadScriptElements() {
    for (const element of this.newHeadScriptElements) {
      document.head.appendChild(activateScriptElement(element));
    }
  }
  async mergeProvisionalElements() {
    const newHeadElements = [...this.newHeadProvisionalElements];
    for (const element of this.currentHeadProvisionalElements) {
      if (!this.isCurrentElementInElementList(element, newHeadElements)) {
        document.head.removeChild(element);
      }
    }
    for (const element of newHeadElements) {
      document.head.appendChild(element);
    }
  }
  isCurrentElementInElementList(element, elementList) {
    for (const [index, newElement] of elementList.entries()) {
      if (element.tagName == "TITLE") {
        if (newElement.tagName != "TITLE") {
          continue;
        }
        if (element.innerHTML == newElement.innerHTML) {
          elementList.splice(index, 1);
          return true;
        }
      }
      if (newElement.isEqualNode(element)) {
        elementList.splice(index, 1);
        return true;
      }
    }
    return false;
  }
  removeCurrentHeadProvisionalElements() {
    for (const element of this.currentHeadProvisionalElements) {
      document.head.removeChild(element);
    }
  }
  copyNewHeadProvisionalElements() {
    for (const element of this.newHeadProvisionalElements) {
      document.head.appendChild(element);
    }
  }
  activateNewBody() {
    document.adoptNode(this.newElement);
    this.activateNewBodyScriptElements();
  }
  activateNewBodyScriptElements() {
    for (const inertScriptElement of this.newBodyScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement);
      inertScriptElement.replaceWith(activatedScriptElement);
    }
  }
  async assignNewBody() {
    await this.renderElement(this.currentElement, this.newElement);
  }
  get newHeadStylesheetElements() {
    return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot);
  }
  get newHeadScriptElements() {
    return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot);
  }
  get currentHeadProvisionalElements() {
    return this.currentHeadSnapshot.provisionalElements;
  }
  get newHeadProvisionalElements() {
    return this.newHeadSnapshot.provisionalElements;
  }
  get newBodyScriptElements() {
    return this.newElement.querySelectorAll("script");
  }
};
var SnapshotCache = class {
  keys = [];
  snapshots = {};
  constructor(size) {
    this.size = size;
  }
  has(location2) {
    return toCacheKey(location2) in this.snapshots;
  }
  get(location2) {
    if (this.has(location2)) {
      const snapshot = this.read(location2);
      this.touch(location2);
      return snapshot;
    }
  }
  put(location2, snapshot) {
    this.write(location2, snapshot);
    this.touch(location2);
    return snapshot;
  }
  clear() {
    this.snapshots = {};
  }
  // Private
  read(location2) {
    return this.snapshots[toCacheKey(location2)];
  }
  write(location2, snapshot) {
    this.snapshots[toCacheKey(location2)] = snapshot;
  }
  touch(location2) {
    const key = toCacheKey(location2);
    const index = this.keys.indexOf(key);
    if (index > -1)
      this.keys.splice(index, 1);
    this.keys.unshift(key);
    this.trim();
  }
  trim() {
    for (const key of this.keys.splice(this.size)) {
      delete this.snapshots[key];
    }
  }
};
var PageView = class extends View {
  snapshotCache = new SnapshotCache(10);
  lastRenderedLocation = new URL(location.href);
  forceReloaded = false;
  shouldTransitionTo(newSnapshot) {
    return this.snapshot.prefersViewTransitions && newSnapshot.prefersViewTransitions;
  }
  renderPage(snapshot, isPreview = false, willRender = true, visit2) {
    const shouldMorphPage = this.isPageRefresh(visit2) && this.snapshot.shouldMorphPage;
    const rendererClass = shouldMorphPage ? MorphRenderer : PageRenderer;
    const renderer = new rendererClass(this.snapshot, snapshot, PageRenderer.renderElement, isPreview, willRender);
    if (!renderer.shouldRender) {
      this.forceReloaded = true;
    } else {
      visit2?.changeHistory();
    }
    return this.render(renderer);
  }
  renderError(snapshot, visit2) {
    visit2?.changeHistory();
    const renderer = new ErrorRenderer(this.snapshot, snapshot, ErrorRenderer.renderElement, false);
    return this.render(renderer);
  }
  clearSnapshotCache() {
    this.snapshotCache.clear();
  }
  async cacheSnapshot(snapshot = this.snapshot) {
    if (snapshot.isCacheable) {
      this.delegate.viewWillCacheSnapshot();
      const { lastRenderedLocation: location2 } = this;
      await nextEventLoopTick();
      const cachedSnapshot = snapshot.clone();
      this.snapshotCache.put(location2, cachedSnapshot);
      return cachedSnapshot;
    }
  }
  getCachedSnapshotForLocation(location2) {
    return this.snapshotCache.get(location2);
  }
  isPageRefresh(visit2) {
    return !visit2 || this.lastRenderedLocation.pathname === visit2.location.pathname && visit2.action === "replace";
  }
  shouldPreserveScrollPosition(visit2) {
    return this.isPageRefresh(visit2) && this.snapshot.shouldPreserveScrollPosition;
  }
  get snapshot() {
    return PageSnapshot.fromElement(this.element);
  }
};
var Preloader = class {
  selector = "a[data-turbo-preload]";
  constructor(delegate, snapshotCache) {
    this.delegate = delegate;
    this.snapshotCache = snapshotCache;
  }
  start() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.#preloadAll);
    } else {
      this.preloadOnLoadLinksForView(document.body);
    }
  }
  stop() {
    document.removeEventListener("DOMContentLoaded", this.#preloadAll);
  }
  preloadOnLoadLinksForView(element) {
    for (const link of element.querySelectorAll(this.selector)) {
      if (this.delegate.shouldPreloadLink(link)) {
        this.preloadURL(link);
      }
    }
  }
  async preloadURL(link) {
    const location2 = new URL(link.href);
    if (this.snapshotCache.has(location2)) {
      return;
    }
    const fetchRequest = new FetchRequest(this, FetchMethod.get, location2, new URLSearchParams(), link);
    await fetchRequest.perform();
  }
  // Fetch request delegate
  prepareRequest(fetchRequest) {
    fetchRequest.headers["Sec-Purpose"] = "prefetch";
  }
  async requestSucceededWithResponse(fetchRequest, fetchResponse) {
    try {
      const responseHTML = await fetchResponse.responseHTML;
      const snapshot = PageSnapshot.fromHTMLString(responseHTML);
      this.snapshotCache.put(fetchRequest.url, snapshot);
    } catch (_) {
    }
  }
  requestStarted(fetchRequest) {
  }
  requestErrored(fetchRequest) {
  }
  requestFinished(fetchRequest) {
  }
  requestPreventedHandlingResponse(fetchRequest, fetchResponse) {
  }
  requestFailedWithResponse(fetchRequest, fetchResponse) {
  }
  #preloadAll = () => {
    this.preloadOnLoadLinksForView(document.body);
  };
};
var Cache = class {
  constructor(session2) {
    this.session = session2;
  }
  clear() {
    this.session.clearCache();
  }
  resetCacheControl() {
    this.#setCacheControl("");
  }
  exemptPageFromCache() {
    this.#setCacheControl("no-cache");
  }
  exemptPageFromPreview() {
    this.#setCacheControl("no-preview");
  }
  #setCacheControl(value) {
    setMetaContent("turbo-cache-control", value);
  }
};
var Session = class {
  navigator = new Navigator(this);
  history = new History(this);
  view = new PageView(this, document.documentElement);
  adapter = new BrowserAdapter(this);
  pageObserver = new PageObserver(this);
  cacheObserver = new CacheObserver();
  linkClickObserver = new LinkClickObserver(this, window);
  formSubmitObserver = new FormSubmitObserver(this, document);
  scrollObserver = new ScrollObserver(this);
  streamObserver = new StreamObserver(this);
  formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement);
  frameRedirector = new FrameRedirector(this, document.documentElement);
  streamMessageRenderer = new StreamMessageRenderer();
  cache = new Cache(this);
  drive = true;
  enabled = true;
  progressBarDelay = 500;
  started = false;
  formMode = "on";
  constructor(recentRequests2) {
    this.recentRequests = recentRequests2;
    this.preloader = new Preloader(this, this.view.snapshotCache);
  }
  start() {
    if (!this.started) {
      this.pageObserver.start();
      this.cacheObserver.start();
      this.formLinkClickObserver.start();
      this.linkClickObserver.start();
      this.formSubmitObserver.start();
      this.scrollObserver.start();
      this.streamObserver.start();
      this.frameRedirector.start();
      this.history.start();
      this.preloader.start();
      this.started = true;
      this.enabled = true;
    }
  }
  disable() {
    this.enabled = false;
  }
  stop() {
    if (this.started) {
      this.pageObserver.stop();
      this.cacheObserver.stop();
      this.formLinkClickObserver.stop();
      this.linkClickObserver.stop();
      this.formSubmitObserver.stop();
      this.scrollObserver.stop();
      this.streamObserver.stop();
      this.frameRedirector.stop();
      this.history.stop();
      this.preloader.stop();
      this.started = false;
    }
  }
  registerAdapter(adapter) {
    this.adapter = adapter;
  }
  visit(location2, options = {}) {
    const frameElement = options.frame ? document.getElementById(options.frame) : null;
    if (frameElement instanceof FrameElement) {
      frameElement.src = location2.toString();
      frameElement.loaded;
    } else {
      this.navigator.proposeVisit(expandURL(location2), options);
    }
  }
  refresh(url, requestId) {
    const isRecentRequest = requestId && this.recentRequests.has(requestId);
    if (!isRecentRequest) {
      this.cache.exemptPageFromPreview();
      this.visit(url, { action: "replace" });
    }
  }
  connectStreamSource(source) {
    this.streamObserver.connectStreamSource(source);
  }
  disconnectStreamSource(source) {
    this.streamObserver.disconnectStreamSource(source);
  }
  renderStreamMessage(message) {
    this.streamMessageRenderer.render(StreamMessage.wrap(message));
  }
  clearCache() {
    this.view.clearSnapshotCache();
  }
  setProgressBarDelay(delay) {
    this.progressBarDelay = delay;
  }
  setFormMode(mode) {
    this.formMode = mode;
  }
  get location() {
    return this.history.location;
  }
  get restorationIdentifier() {
    return this.history.restorationIdentifier;
  }
  // Preloader delegate
  shouldPreloadLink(element) {
    const isUnsafe = element.hasAttribute("data-turbo-method");
    const isStream = element.hasAttribute("data-turbo-stream");
    const frameTarget = element.getAttribute("data-turbo-frame");
    const frame = frameTarget == "_top" ? null : document.getElementById(frameTarget) || findClosestRecursively(element, "turbo-frame:not([disabled])");
    if (isUnsafe || isStream || frame instanceof FrameElement) {
      return false;
    } else {
      const location2 = new URL(element.href);
      return this.elementIsNavigatable(element) && locationIsVisitable(location2, this.snapshot.rootLocation);
    }
  }
  // History delegate
  historyPoppedToLocationWithRestorationIdentifierAndDirection(location2, restorationIdentifier, direction) {
    if (this.enabled) {
      this.navigator.startVisit(location2, restorationIdentifier, {
        action: "restore",
        historyChanged: true,
        direction
      });
    } else {
      this.adapter.pageInvalidated({
        reason: "turbo_disabled"
      });
    }
  }
  // Scroll observer delegate
  scrollPositionChanged(position) {
    this.history.updateRestorationData({ scrollPosition: position });
  }
  // Form click observer delegate
  willSubmitFormLinkToLocation(link, location2) {
    return this.elementIsNavigatable(link) && locationIsVisitable(location2, this.snapshot.rootLocation);
  }
  submittedFormLinkToLocation() {
  }
  // Link click observer delegate
  willFollowLinkToLocation(link, location2, event) {
    return this.elementIsNavigatable(link) && locationIsVisitable(location2, this.snapshot.rootLocation) && this.applicationAllowsFollowingLinkToLocation(link, location2, event);
  }
  followedLinkToLocation(link, location2) {
    const action = this.getActionForLink(link);
    const acceptsStreamResponse = link.hasAttribute("data-turbo-stream");
    this.visit(location2.href, { action, acceptsStreamResponse });
  }
  // Navigator delegate
  allowsVisitingLocationWithAction(location2, action) {
    return this.locationWithActionIsSamePage(location2, action) || this.applicationAllowsVisitingLocation(location2);
  }
  visitProposedToLocation(location2, options) {
    extendURLWithDeprecatedProperties(location2);
    this.adapter.visitProposedToLocation(location2, options);
  }
  // Visit delegate
  visitStarted(visit2) {
    if (!visit2.acceptsStreamResponse) {
      markAsBusy(document.documentElement);
      this.view.markVisitDirection(visit2.direction);
    }
    extendURLWithDeprecatedProperties(visit2.location);
    if (!visit2.silent) {
      this.notifyApplicationAfterVisitingLocation(visit2.location, visit2.action);
    }
  }
  visitCompleted(visit2) {
    this.view.unmarkVisitDirection();
    clearBusyState(document.documentElement);
    this.notifyApplicationAfterPageLoad(visit2.getTimingMetrics());
  }
  locationWithActionIsSamePage(location2, action) {
    return this.navigator.locationWithActionIsSamePage(location2, action);
  }
  visitScrolledToSamePageLocation(oldURL, newURL) {
    this.notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL);
  }
  // Form submit observer delegate
  willSubmitForm(form, submitter) {
    const action = getAction$1(form, submitter);
    return this.submissionIsNavigatable(form, submitter) && locationIsVisitable(expandURL(action), this.snapshot.rootLocation);
  }
  formSubmitted(form, submitter) {
    this.navigator.submitForm(form, submitter);
  }
  // Page observer delegate
  pageBecameInteractive() {
    this.view.lastRenderedLocation = this.location;
    this.notifyApplicationAfterPageLoad();
  }
  pageLoaded() {
    this.history.assumeControlOfScrollRestoration();
  }
  pageWillUnload() {
    this.history.relinquishControlOfScrollRestoration();
  }
  // Stream observer delegate
  receivedMessageFromStream(message) {
    this.renderStreamMessage(message);
  }
  // Page view delegate
  viewWillCacheSnapshot() {
    if (!this.navigator.currentVisit?.silent) {
      this.notifyApplicationBeforeCachingSnapshot();
    }
  }
  allowsImmediateRender({ element }, isPreview, options) {
    const event = this.notifyApplicationBeforeRender(element, isPreview, options);
    const {
      defaultPrevented,
      detail: { render }
    } = event;
    if (this.view.renderer && render) {
      this.view.renderer.renderElement = render;
    }
    return !defaultPrevented;
  }
  viewRenderedSnapshot(_snapshot, isPreview, renderMethod) {
    this.view.lastRenderedLocation = this.history.location;
    this.notifyApplicationAfterRender(isPreview, renderMethod);
  }
  preloadOnLoadLinksForView(element) {
    this.preloader.preloadOnLoadLinksForView(element);
  }
  viewInvalidated(reason) {
    this.adapter.pageInvalidated(reason);
  }
  // Frame element
  frameLoaded(frame) {
    this.notifyApplicationAfterFrameLoad(frame);
  }
  frameRendered(fetchResponse, frame) {
    this.notifyApplicationAfterFrameRender(fetchResponse, frame);
  }
  // Application events
  applicationAllowsFollowingLinkToLocation(link, location2, ev) {
    const event = this.notifyApplicationAfterClickingLinkToLocation(link, location2, ev);
    return !event.defaultPrevented;
  }
  applicationAllowsVisitingLocation(location2) {
    const event = this.notifyApplicationBeforeVisitingLocation(location2);
    return !event.defaultPrevented;
  }
  notifyApplicationAfterClickingLinkToLocation(link, location2, event) {
    return dispatch("turbo:click", {
      target: link,
      detail: { url: location2.href, originalEvent: event },
      cancelable: true
    });
  }
  notifyApplicationBeforeVisitingLocation(location2) {
    return dispatch("turbo:before-visit", {
      detail: { url: location2.href },
      cancelable: true
    });
  }
  notifyApplicationAfterVisitingLocation(location2, action) {
    return dispatch("turbo:visit", { detail: { url: location2.href, action } });
  }
  notifyApplicationBeforeCachingSnapshot() {
    return dispatch("turbo:before-cache");
  }
  notifyApplicationBeforeRender(newBody, isPreview, options) {
    return dispatch("turbo:before-render", {
      detail: { newBody, isPreview, ...options },
      cancelable: true
    });
  }
  notifyApplicationAfterRender(isPreview, renderMethod) {
    return dispatch("turbo:render", { detail: { isPreview, renderMethod } });
  }
  notifyApplicationAfterPageLoad(timing = {}) {
    return dispatch("turbo:load", {
      detail: { url: this.location.href, timing }
    });
  }
  notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL) {
    dispatchEvent(
      new HashChangeEvent("hashchange", {
        oldURL: oldURL.toString(),
        newURL: newURL.toString()
      })
    );
  }
  notifyApplicationAfterFrameLoad(frame) {
    return dispatch("turbo:frame-load", { target: frame });
  }
  notifyApplicationAfterFrameRender(fetchResponse, frame) {
    return dispatch("turbo:frame-render", {
      detail: { fetchResponse },
      target: frame,
      cancelable: true
    });
  }
  // Helpers
  submissionIsNavigatable(form, submitter) {
    if (this.formMode == "off") {
      return false;
    } else {
      const submitterIsNavigatable = submitter ? this.elementIsNavigatable(submitter) : true;
      if (this.formMode == "optin") {
        return submitterIsNavigatable && form.closest('[data-turbo="true"]') != null;
      } else {
        return submitterIsNavigatable && this.elementIsNavigatable(form);
      }
    }
  }
  elementIsNavigatable(element) {
    const container = findClosestRecursively(element, "[data-turbo]");
    const withinFrame = findClosestRecursively(element, "turbo-frame");
    if (this.drive || withinFrame) {
      if (container) {
        return container.getAttribute("data-turbo") != "false";
      } else {
        return true;
      }
    } else {
      if (container) {
        return container.getAttribute("data-turbo") == "true";
      } else {
        return false;
      }
    }
  }
  // Private
  getActionForLink(link) {
    return getVisitAction(link) || "advance";
  }
  get snapshot() {
    return this.view.snapshot;
  }
};
function extendURLWithDeprecatedProperties(url) {
  Object.defineProperties(url, deprecatedLocationPropertyDescriptors);
}
var deprecatedLocationPropertyDescriptors = {
  absoluteURL: {
    get() {
      return this.toString();
    }
  }
};
var session = new Session(recentRequests);
var { cache, navigator: navigator$1 } = session;
function start() {
  session.start();
}
function registerAdapter(adapter) {
  session.registerAdapter(adapter);
}
function visit(location2, options) {
  session.visit(location2, options);
}
function connectStreamSource(source) {
  session.connectStreamSource(source);
}
function disconnectStreamSource(source) {
  session.disconnectStreamSource(source);
}
function renderStreamMessage(message) {
  session.renderStreamMessage(message);
}
function clearCache() {
  console.warn(
    "Please replace `Turbo.clearCache()` with `Turbo.cache.clear()`. The top-level function is deprecated and will be removed in a future version of Turbo.`"
  );
  session.clearCache();
}
function setProgressBarDelay(delay) {
  session.setProgressBarDelay(delay);
}
function setConfirmMethod(confirmMethod) {
  FormSubmission.confirmMethod = confirmMethod;
}
function setFormMode(mode) {
  session.setFormMode(mode);
}
var Turbo = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  navigator: navigator$1,
  session,
  cache,
  PageRenderer,
  PageSnapshot,
  FrameRenderer,
  fetch: fetchWithTurboHeaders,
  start,
  registerAdapter,
  visit,
  connectStreamSource,
  disconnectStreamSource,
  renderStreamMessage,
  clearCache,
  setProgressBarDelay,
  setConfirmMethod,
  setFormMode
});
var TurboFrameMissingError = class extends Error {
};
var FrameController = class {
  fetchResponseLoaded = (_fetchResponse) => Promise.resolve();
  #currentFetchRequest = null;
  #resolveVisitPromise = () => {
  };
  #connected = false;
  #hasBeenLoaded = false;
  #ignoredAttributes = /* @__PURE__ */ new Set();
  action = null;
  constructor(element) {
    this.element = element;
    this.view = new FrameView(this, this.element);
    this.appearanceObserver = new AppearanceObserver(this, this.element);
    this.formLinkClickObserver = new FormLinkClickObserver(this, this.element);
    this.linkInterceptor = new LinkInterceptor(this, this.element);
    this.restorationIdentifier = uuid();
    this.formSubmitObserver = new FormSubmitObserver(this, this.element);
  }
  // Frame delegate
  connect() {
    if (!this.#connected) {
      this.#connected = true;
      if (this.loadingStyle == FrameLoadingStyle.lazy) {
        this.appearanceObserver.start();
      } else {
        this.#loadSourceURL();
      }
      this.formLinkClickObserver.start();
      this.linkInterceptor.start();
      this.formSubmitObserver.start();
    }
  }
  disconnect() {
    if (this.#connected) {
      this.#connected = false;
      this.appearanceObserver.stop();
      this.formLinkClickObserver.stop();
      this.linkInterceptor.stop();
      this.formSubmitObserver.stop();
    }
  }
  disabledChanged() {
    if (this.loadingStyle == FrameLoadingStyle.eager) {
      this.#loadSourceURL();
    }
  }
  sourceURLChanged() {
    if (this.#isIgnoringChangesTo("src"))
      return;
    if (this.element.isConnected) {
      this.complete = false;
    }
    if (this.loadingStyle == FrameLoadingStyle.eager || this.#hasBeenLoaded) {
      this.#loadSourceURL();
    }
  }
  sourceURLReloaded() {
    const { src } = this.element;
    this.#ignoringChangesToAttribute("complete", () => {
      this.element.removeAttribute("complete");
    });
    this.element.src = null;
    this.element.src = src;
    return this.element.loaded;
  }
  completeChanged() {
    if (this.#isIgnoringChangesTo("complete"))
      return;
    this.#loadSourceURL();
  }
  loadingStyleChanged() {
    if (this.loadingStyle == FrameLoadingStyle.lazy) {
      this.appearanceObserver.start();
    } else {
      this.appearanceObserver.stop();
      this.#loadSourceURL();
    }
  }
  async #loadSourceURL() {
    if (this.enabled && this.isActive && !this.complete && this.sourceURL) {
      this.element.loaded = this.#visit(expandURL(this.sourceURL));
      this.appearanceObserver.stop();
      await this.element.loaded;
      this.#hasBeenLoaded = true;
    }
  }
  async loadResponse(fetchResponse) {
    if (fetchResponse.redirected || fetchResponse.succeeded && fetchResponse.isHTML) {
      this.sourceURL = fetchResponse.response.url;
    }
    try {
      const html = await fetchResponse.responseHTML;
      if (html) {
        const document2 = parseHTMLDocument(html);
        const pageSnapshot = PageSnapshot.fromDocument(document2);
        if (pageSnapshot.isVisitable) {
          await this.#loadFrameResponse(fetchResponse, document2);
        } else {
          await this.#handleUnvisitableFrameResponse(fetchResponse);
        }
      }
    } finally {
      this.fetchResponseLoaded = () => Promise.resolve();
    }
  }
  // Appearance observer delegate
  elementAppearedInViewport(element) {
    this.proposeVisitIfNavigatedWithAction(element, element);
    this.#loadSourceURL();
  }
  // Form link click observer delegate
  willSubmitFormLinkToLocation(link) {
    return this.#shouldInterceptNavigation(link);
  }
  submittedFormLinkToLocation(link, _location, form) {
    const frame = this.#findFrameElement(link);
    if (frame)
      form.setAttribute("data-turbo-frame", frame.id);
  }
  // Link interceptor delegate
  shouldInterceptLinkClick(element, _location, _event) {
    return this.#shouldInterceptNavigation(element);
  }
  linkClickIntercepted(element, location2) {
    this.#navigateFrame(element, location2);
  }
  // Form submit observer delegate
  willSubmitForm(element, submitter) {
    return element.closest("turbo-frame") == this.element && this.#shouldInterceptNavigation(element, submitter);
  }
  formSubmitted(element, submitter) {
    if (this.formSubmission) {
      this.formSubmission.stop();
    }
    this.formSubmission = new FormSubmission(this, element, submitter);
    const { fetchRequest } = this.formSubmission;
    this.prepareRequest(fetchRequest);
    this.formSubmission.start();
  }
  // Fetch request delegate
  prepareRequest(request) {
    request.headers["Turbo-Frame"] = this.id;
    if (this.currentNavigationElement?.hasAttribute("data-turbo-stream")) {
      request.acceptResponseType(StreamMessage.contentType);
    }
  }
  requestStarted(_request) {
    markAsBusy(this.element);
  }
  requestPreventedHandlingResponse(_request, _response) {
    this.#resolveVisitPromise();
  }
  async requestSucceededWithResponse(request, response) {
    await this.loadResponse(response);
    this.#resolveVisitPromise();
  }
  async requestFailedWithResponse(request, response) {
    await this.loadResponse(response);
    this.#resolveVisitPromise();
  }
  requestErrored(request, error) {
    console.error(error);
    this.#resolveVisitPromise();
  }
  requestFinished(_request) {
    clearBusyState(this.element);
  }
  // Form submission delegate
  formSubmissionStarted({ formElement }) {
    markAsBusy(formElement, this.#findFrameElement(formElement));
  }
  formSubmissionSucceededWithResponse(formSubmission, response) {
    const frame = this.#findFrameElement(formSubmission.formElement, formSubmission.submitter);
    frame.delegate.proposeVisitIfNavigatedWithAction(frame, formSubmission.formElement, formSubmission.submitter);
    frame.delegate.loadResponse(response);
    if (!formSubmission.isSafe) {
      session.clearCache();
    }
  }
  formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
    this.element.delegate.loadResponse(fetchResponse);
    session.clearCache();
  }
  formSubmissionErrored(formSubmission, error) {
    console.error(error);
  }
  formSubmissionFinished({ formElement }) {
    clearBusyState(formElement, this.#findFrameElement(formElement));
  }
  // View delegate
  allowsImmediateRender({ element: newFrame }, _isPreview, options) {
    const event = dispatch("turbo:before-frame-render", {
      target: this.element,
      detail: { newFrame, ...options },
      cancelable: true
    });
    const {
      defaultPrevented,
      detail: { render }
    } = event;
    if (this.view.renderer && render) {
      this.view.renderer.renderElement = render;
    }
    return !defaultPrevented;
  }
  viewRenderedSnapshot(_snapshot, _isPreview, _renderMethod) {
  }
  preloadOnLoadLinksForView(element) {
    session.preloadOnLoadLinksForView(element);
  }
  viewInvalidated() {
  }
  // Frame renderer delegate
  willRenderFrame(currentElement, _newElement) {
    this.previousFrameElement = currentElement.cloneNode(true);
  }
  visitCachedSnapshot = ({ element }) => {
    const frame = element.querySelector("#" + this.element.id);
    if (frame && this.previousFrameElement) {
      frame.replaceChildren(...this.previousFrameElement.children);
    }
    delete this.previousFrameElement;
  };
  // Private
  async #loadFrameResponse(fetchResponse, document2) {
    const newFrameElement = await this.extractForeignFrameElement(document2.body);
    if (newFrameElement) {
      const snapshot = new Snapshot(newFrameElement);
      const renderer = new FrameRenderer(this, this.view.snapshot, snapshot, FrameRenderer.renderElement, false, false);
      if (this.view.renderPromise)
        await this.view.renderPromise;
      this.changeHistory();
      await this.view.render(renderer);
      this.complete = true;
      session.frameRendered(fetchResponse, this.element);
      session.frameLoaded(this.element);
      await this.fetchResponseLoaded(fetchResponse);
    } else if (this.#willHandleFrameMissingFromResponse(fetchResponse)) {
      this.#handleFrameMissingFromResponse(fetchResponse);
    }
  }
  async #visit(url) {
    const request = new FetchRequest(this, FetchMethod.get, url, new URLSearchParams(), this.element);
    this.#currentFetchRequest?.cancel();
    this.#currentFetchRequest = request;
    return new Promise((resolve) => {
      this.#resolveVisitPromise = () => {
        this.#resolveVisitPromise = () => {
        };
        this.#currentFetchRequest = null;
        resolve();
      };
      request.perform();
    });
  }
  #navigateFrame(element, url, submitter) {
    const frame = this.#findFrameElement(element, submitter);
    frame.delegate.proposeVisitIfNavigatedWithAction(frame, element, submitter);
    this.#withCurrentNavigationElement(element, () => {
      frame.src = url;
    });
  }
  proposeVisitIfNavigatedWithAction(frame, element, submitter) {
    this.action = getVisitAction(submitter, element, frame);
    if (this.action) {
      const pageSnapshot = PageSnapshot.fromElement(frame).clone();
      const { visitCachedSnapshot } = frame.delegate;
      frame.delegate.fetchResponseLoaded = async (fetchResponse) => {
        if (frame.src) {
          const { statusCode, redirected } = fetchResponse;
          const responseHTML = await fetchResponse.responseHTML;
          const response = { statusCode, redirected, responseHTML };
          const options = {
            response,
            visitCachedSnapshot,
            willRender: false,
            updateHistory: false,
            restorationIdentifier: this.restorationIdentifier,
            snapshot: pageSnapshot
          };
          if (this.action)
            options.action = this.action;
          session.visit(frame.src, options);
        }
      };
    }
  }
  changeHistory() {
    if (this.action) {
      const method = getHistoryMethodForAction(this.action);
      session.history.update(method, expandURL(this.element.src || ""), this.restorationIdentifier);
    }
  }
  async #handleUnvisitableFrameResponse(fetchResponse) {
    console.warn(
      `The response (${fetchResponse.statusCode}) from <turbo-frame id="${this.element.id}"> is performing a full page visit due to turbo-visit-control.`
    );
    await this.#visitResponse(fetchResponse.response);
  }
  #willHandleFrameMissingFromResponse(fetchResponse) {
    this.element.setAttribute("complete", "");
    const response = fetchResponse.response;
    const visit2 = async (url, options) => {
      if (url instanceof Response) {
        this.#visitResponse(url);
      } else {
        session.visit(url, options);
      }
    };
    const event = dispatch("turbo:frame-missing", {
      target: this.element,
      detail: { response, visit: visit2 },
      cancelable: true
    });
    return !event.defaultPrevented;
  }
  #handleFrameMissingFromResponse(fetchResponse) {
    this.view.missing();
    this.#throwFrameMissingError(fetchResponse);
  }
  #throwFrameMissingError(fetchResponse) {
    const message = `The response (${fetchResponse.statusCode}) did not contain the expected <turbo-frame id="${this.element.id}"> and will be ignored. To perform a full page visit instead, set turbo-visit-control to reload.`;
    throw new TurboFrameMissingError(message);
  }
  async #visitResponse(response) {
    const wrapped = new FetchResponse(response);
    const responseHTML = await wrapped.responseHTML;
    const { location: location2, redirected, statusCode } = wrapped;
    return session.visit(location2, { response: { redirected, statusCode, responseHTML } });
  }
  #findFrameElement(element, submitter) {
    const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
    return getFrameElementById(id) ?? this.element;
  }
  async extractForeignFrameElement(container) {
    let element;
    const id = CSS.escape(this.id);
    try {
      element = activateElement(container.querySelector(`turbo-frame#${id}`), this.sourceURL);
      if (element) {
        return element;
      }
      element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id}]`), this.sourceURL);
      if (element) {
        await element.loaded;
        return await this.extractForeignFrameElement(element);
      }
    } catch (error) {
      console.error(error);
      return new FrameElement();
    }
    return null;
  }
  #formActionIsVisitable(form, submitter) {
    const action = getAction$1(form, submitter);
    return locationIsVisitable(expandURL(action), this.rootLocation);
  }
  #shouldInterceptNavigation(element, submitter) {
    const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
    if (element instanceof HTMLFormElement && !this.#formActionIsVisitable(element, submitter)) {
      return false;
    }
    if (!this.enabled || id == "_top") {
      return false;
    }
    if (id) {
      const frameElement = getFrameElementById(id);
      if (frameElement) {
        return !frameElement.disabled;
      }
    }
    if (!session.elementIsNavigatable(element)) {
      return false;
    }
    if (submitter && !session.elementIsNavigatable(submitter)) {
      return false;
    }
    return true;
  }
  // Computed properties
  get id() {
    return this.element.id;
  }
  get enabled() {
    return !this.element.disabled;
  }
  get sourceURL() {
    if (this.element.src) {
      return this.element.src;
    }
  }
  set sourceURL(sourceURL) {
    this.#ignoringChangesToAttribute("src", () => {
      this.element.src = sourceURL ?? null;
    });
  }
  get loadingStyle() {
    return this.element.loading;
  }
  get isLoading() {
    return this.formSubmission !== void 0 || this.#resolveVisitPromise() !== void 0;
  }
  get complete() {
    return this.element.hasAttribute("complete");
  }
  set complete(value) {
    this.#ignoringChangesToAttribute("complete", () => {
      if (value) {
        this.element.setAttribute("complete", "");
      } else {
        this.element.removeAttribute("complete");
      }
    });
  }
  get isActive() {
    return this.element.isActive && this.#connected;
  }
  get rootLocation() {
    const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
    const root = meta?.content ?? "/";
    return expandURL(root);
  }
  #isIgnoringChangesTo(attributeName) {
    return this.#ignoredAttributes.has(attributeName);
  }
  #ignoringChangesToAttribute(attributeName, callback) {
    this.#ignoredAttributes.add(attributeName);
    callback();
    this.#ignoredAttributes.delete(attributeName);
  }
  #withCurrentNavigationElement(element, callback) {
    this.currentNavigationElement = element;
    callback();
    delete this.currentNavigationElement;
  }
};
function getFrameElementById(id) {
  if (id != null) {
    const element = document.getElementById(id);
    if (element instanceof FrameElement) {
      return element;
    }
  }
}
function activateElement(element, currentURL) {
  if (element) {
    const src = element.getAttribute("src");
    if (src != null && currentURL != null && urlsAreEqual(src, currentURL)) {
      throw new Error(`Matching <turbo-frame id="${element.id}"> element has a source URL which references itself`);
    }
    if (element.ownerDocument !== document) {
      element = document.importNode(element, true);
    }
    if (element instanceof FrameElement) {
      element.connectedCallback();
      element.disconnectedCallback();
      return element;
    }
  }
}
var StreamActions = {
  after() {
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e.nextSibling));
  },
  append() {
    this.removeDuplicateTargetChildren();
    this.targetElements.forEach((e) => e.append(this.templateContent));
  },
  before() {
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e));
  },
  prepend() {
    this.removeDuplicateTargetChildren();
    this.targetElements.forEach((e) => e.prepend(this.templateContent));
  },
  remove() {
    this.targetElements.forEach((e) => e.remove());
  },
  replace() {
    this.targetElements.forEach((e) => e.replaceWith(this.templateContent));
  },
  update() {
    this.targetElements.forEach((targetElement) => {
      targetElement.innerHTML = "";
      targetElement.append(this.templateContent);
    });
  },
  refresh() {
    session.refresh(this.baseURI, this.requestId);
  }
};
var StreamElement = class _StreamElement extends HTMLElement {
  static async renderElement(newElement) {
    await newElement.performAction();
  }
  async connectedCallback() {
    try {
      await this.render();
    } catch (error) {
      console.error(error);
    } finally {
      this.disconnect();
    }
  }
  async render() {
    return this.renderPromise ??= (async () => {
      const event = this.beforeRenderEvent;
      if (this.dispatchEvent(event)) {
        await nextRepaint();
        await event.detail.render(this);
      }
    })();
  }
  disconnect() {
    try {
      this.remove();
    } catch {
    }
  }
  /**
   * Removes duplicate children (by ID)
   */
  removeDuplicateTargetChildren() {
    this.duplicateChildren.forEach((c) => c.remove());
  }
  /**
   * Gets the list of duplicate children (i.e. those with the same ID)
   */
  get duplicateChildren() {
    const existingChildren = this.targetElements.flatMap((e) => [...e.children]).filter((c) => !!c.id);
    const newChildrenIds = [...this.templateContent?.children || []].filter((c) => !!c.id).map((c) => c.id);
    return existingChildren.filter((c) => newChildrenIds.includes(c.id));
  }
  /**
   * Gets the action function to be performed.
   */
  get performAction() {
    if (this.action) {
      const actionFunction = StreamActions[this.action];
      if (actionFunction) {
        return actionFunction;
      }
      this.#raise("unknown action");
    }
    this.#raise("action attribute is missing");
  }
  /**
   * Gets the target elements which the template will be rendered to.
   */
  get targetElements() {
    if (this.target) {
      return this.targetElementsById;
    } else if (this.targets) {
      return this.targetElementsByQuery;
    } else {
      this.#raise("target or targets attribute is missing");
    }
  }
  /**
   * Gets the contents of the main `<template>`.
   */
  get templateContent() {
    return this.templateElement.content.cloneNode(true);
  }
  /**
   * Gets the main `<template>` used for rendering
   */
  get templateElement() {
    if (this.firstElementChild === null) {
      const template = this.ownerDocument.createElement("template");
      this.appendChild(template);
      return template;
    } else if (this.firstElementChild instanceof HTMLTemplateElement) {
      return this.firstElementChild;
    }
    this.#raise("first child element must be a <template> element");
  }
  /**
   * Gets the current action.
   */
  get action() {
    return this.getAttribute("action");
  }
  /**
   * Gets the current target (an element ID) to which the result will
   * be rendered.
   */
  get target() {
    return this.getAttribute("target");
  }
  /**
   * Gets the current "targets" selector (a CSS selector)
   */
  get targets() {
    return this.getAttribute("targets");
  }
  /**
   * Reads the request-id attribute
   */
  get requestId() {
    return this.getAttribute("request-id");
  }
  #raise(message) {
    throw new Error(`${this.description}: ${message}`);
  }
  get description() {
    return (this.outerHTML.match(/<[^>]+>/) ?? [])[0] ?? "<turbo-stream>";
  }
  get beforeRenderEvent() {
    return new CustomEvent("turbo:before-stream-render", {
      bubbles: true,
      cancelable: true,
      detail: { newStream: this, render: _StreamElement.renderElement }
    });
  }
  get targetElementsById() {
    const element = this.ownerDocument?.getElementById(this.target);
    if (element !== null) {
      return [element];
    } else {
      return [];
    }
  }
  get targetElementsByQuery() {
    const elements = this.ownerDocument?.querySelectorAll(this.targets);
    if (elements.length !== 0) {
      return Array.prototype.slice.call(elements);
    } else {
      return [];
    }
  }
};
var StreamSourceElement = class extends HTMLElement {
  streamSource = null;
  connectedCallback() {
    this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src);
    connectStreamSource(this.streamSource);
  }
  disconnectedCallback() {
    if (this.streamSource) {
      this.streamSource.close();
      disconnectStreamSource(this.streamSource);
    }
  }
  get src() {
    return this.getAttribute("src") || "";
  }
};
FrameElement.delegateConstructor = FrameController;
if (customElements.get("turbo-frame") === void 0) {
  customElements.define("turbo-frame", FrameElement);
}
if (customElements.get("turbo-stream") === void 0) {
  customElements.define("turbo-stream", StreamElement);
}
if (customElements.get("turbo-stream-source") === void 0) {
  customElements.define("turbo-stream-source", StreamSourceElement);
}
(() => {
  let element = document.currentScript;
  if (!element)
    return;
  if (element.hasAttribute("data-turbo-suppress-warning"))
    return;
  element = element.parentElement;
  while (element) {
    if (element == document.body) {
      return console.warn(
        unindent`
        You are loading Turbo from a <script> element inside the <body> element. This is probably not what you meant to do!

        Load your application’s JavaScript bundle inside the <head> element instead. <script> elements in <body> are evaluated with each page change.

        For more information, see: https://turbo.hotwired.dev/handbook/building#working-with-script-elements

        ——
        Suppress this warning by adding a "data-turbo-suppress-warning" attribute to: %s
      `,
        element.outerHTML
      );
    }
    element = element.parentElement;
  }
})();
window.Turbo = { ...Turbo, StreamActions };
start();

// node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable.js
var consumer;
async function getConsumer() {
  return consumer || setConsumer(createConsumer2().then(setConsumer));
}
function setConsumer(newConsumer) {
  return consumer = newConsumer;
}
async function createConsumer2() {
  const { createConsumer: createConsumer3 } = await Promise.resolve().then(() => (init_src(), src_exports));
  return createConsumer3();
}
async function subscribeTo(channel, mixin) {
  const { subscriptions } = await getConsumer();
  return subscriptions.create(channel, mixin);
}

// node_modules/@hotwired/turbo-rails/app/javascript/turbo/snakeize.js
function walk(obj) {
  if (!obj || typeof obj !== "object")
    return obj;
  if (obj instanceof Date || obj instanceof RegExp)
    return obj;
  if (Array.isArray(obj))
    return obj.map(walk);
  return Object.keys(obj).reduce(function(acc, key) {
    var camel = key[0].toLowerCase() + key.slice(1).replace(/([A-Z]+)/g, function(m, x) {
      return "_" + x.toLowerCase();
    });
    acc[camel] = walk(obj[key]);
    return acc;
  }, {});
}

// node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable_stream_source_element.js
var TurboCableStreamSourceElement = class extends HTMLElement {
  async connectedCallback() {
    connectStreamSource(this);
    this.subscription = await subscribeTo(this.channel, {
      received: this.dispatchMessageEvent.bind(this),
      connected: this.subscriptionConnected.bind(this),
      disconnected: this.subscriptionDisconnected.bind(this)
    });
  }
  disconnectedCallback() {
    disconnectStreamSource(this);
    if (this.subscription)
      this.subscription.unsubscribe();
  }
  dispatchMessageEvent(data) {
    const event = new MessageEvent("message", { data });
    return this.dispatchEvent(event);
  }
  subscriptionConnected() {
    this.setAttribute("connected", "");
  }
  subscriptionDisconnected() {
    this.removeAttribute("connected");
  }
  get channel() {
    const channel = this.getAttribute("channel");
    const signed_stream_name = this.getAttribute("signed-stream-name");
    return { channel, signed_stream_name, ...walk({ ...this.dataset }) };
  }
};
if (customElements.get("turbo-cable-stream-source") === void 0) {
  customElements.define("turbo-cable-stream-source", TurboCableStreamSourceElement);
}

// node_modules/@hotwired/turbo-rails/app/javascript/turbo/fetch_requests.js
function encodeMethodIntoRequestBody(event) {
  if (event.target instanceof HTMLFormElement) {
    const { target: form, detail: { fetchOptions } } = event;
    form.addEventListener("turbo:submit-start", ({ detail: { formSubmission: { submitter } } }) => {
      const body = isBodyInit(fetchOptions.body) ? fetchOptions.body : new URLSearchParams();
      const method = determineFetchMethod(submitter, body, form);
      if (!/get/i.test(method)) {
        if (/post/i.test(method)) {
          body.delete("_method");
        } else {
          body.set("_method", method);
        }
        fetchOptions.method = "post";
      }
    }, { once: true });
  }
}
function determineFetchMethod(submitter, body, form) {
  const formMethod = determineFormMethod(submitter);
  const overrideMethod = body.get("_method");
  const method = form.getAttribute("method") || "get";
  if (typeof formMethod == "string") {
    return formMethod;
  } else if (typeof overrideMethod == "string") {
    return overrideMethod;
  } else {
    return method;
  }
}
function determineFormMethod(submitter) {
  if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
    if (submitter.name === "_method") {
      return submitter.value;
    } else if (submitter.hasAttribute("formmethod")) {
      return submitter.formMethod;
    } else {
      return null;
    }
  } else {
    return null;
  }
}
function isBodyInit(body) {
  return body instanceof FormData || body instanceof URLSearchParams;
}

// node_modules/@hotwired/turbo-rails/app/javascript/turbo/index.js
window.Turbo = turbo_es2017_esm_exports;
addEventListener("turbo:before-fetch-request", encodeMethodIntoRequestBody);

// node_modules/@hotwired/stimulus/dist/stimulus.js
function camelize(value) {
  return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase());
}
function namespaceCamelize(value) {
  return camelize(value.replace(/--/g, "-").replace(/__/g, "_"));
}
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function dasherize(value) {
  return value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`);
}
function isSomething(object) {
  return object !== null && object !== void 0;
}
function hasProperty(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}
function readInheritableStaticArrayValues(constructor, propertyName) {
  const ancestors = getAncestorsForConstructor(constructor);
  return Array.from(ancestors.reduce((values, constructor2) => {
    getOwnStaticArrayValues(constructor2, propertyName).forEach((name) => values.add(name));
    return values;
  }, /* @__PURE__ */ new Set()));
}
function readInheritableStaticObjectPairs(constructor, propertyName) {
  const ancestors = getAncestorsForConstructor(constructor);
  return ancestors.reduce((pairs, constructor2) => {
    pairs.push(...getOwnStaticObjectPairs(constructor2, propertyName));
    return pairs;
  }, []);
}
function getAncestorsForConstructor(constructor) {
  const ancestors = [];
  while (constructor) {
    ancestors.push(constructor);
    constructor = Object.getPrototypeOf(constructor);
  }
  return ancestors.reverse();
}
function getOwnStaticArrayValues(constructor, propertyName) {
  const definition = constructor[propertyName];
  return Array.isArray(definition) ? definition : [];
}
function getOwnStaticObjectPairs(constructor, propertyName) {
  const definition = constructor[propertyName];
  return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
}
var getOwnKeys = (() => {
  if (typeof Object.getOwnPropertySymbols == "function") {
    return (object) => [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)];
  } else {
    return Object.getOwnPropertyNames;
  }
})();
var extend2 = (() => {
  function extendWithReflect(constructor) {
    function extended() {
      return Reflect.construct(constructor, arguments, new.target);
    }
    extended.prototype = Object.create(constructor.prototype, {
      constructor: { value: extended }
    });
    Reflect.setPrototypeOf(extended, constructor);
    return extended;
  }
  function testReflectExtension() {
    const a = function() {
      this.a.call(this);
    };
    const b = extendWithReflect(a);
    b.prototype.a = function() {
    };
    return new b();
  }
  try {
    testReflectExtension();
    return extendWithReflect;
  } catch (error) {
    return (constructor) => class extended extends constructor {
    };
  }
})();
var defaultSchema = {
  controllerAttribute: "data-controller",
  actionAttribute: "data-action",
  targetAttribute: "data-target",
  targetAttributeForScope: (identifier) => `data-${identifier}-target`,
  outletAttributeForScope: (identifier, outlet) => `data-${identifier}-${outlet}-outlet`,
  keyMappings: Object.assign(Object.assign({ enter: "Enter", tab: "Tab", esc: "Escape", space: " ", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", home: "Home", end: "End", page_up: "PageUp", page_down: "PageDown" }, objectFromEntries("abcdefghijklmnopqrstuvwxyz".split("").map((c) => [c, c]))), objectFromEntries("0123456789".split("").map((n) => [n, n])))
};
function objectFromEntries(array) {
  return array.reduce((memo, [k, v]) => Object.assign(Object.assign({}, memo), { [k]: v }), {});
}
function ClassPropertiesBlessing(constructor) {
  const classes = readInheritableStaticArrayValues(constructor, "classes");
  return classes.reduce((properties, classDefinition) => {
    return Object.assign(properties, propertiesForClassDefinition(classDefinition));
  }, {});
}
function propertiesForClassDefinition(key) {
  return {
    [`${key}Class`]: {
      get() {
        const { classes } = this;
        if (classes.has(key)) {
          return classes.get(key);
        } else {
          const attribute = classes.getAttributeName(key);
          throw new Error(`Missing attribute "${attribute}"`);
        }
      }
    },
    [`${key}Classes`]: {
      get() {
        return this.classes.getAll(key);
      }
    },
    [`has${capitalize(key)}Class`]: {
      get() {
        return this.classes.has(key);
      }
    }
  };
}
function OutletPropertiesBlessing(constructor) {
  const outlets = readInheritableStaticArrayValues(constructor, "outlets");
  return outlets.reduce((properties, outletDefinition) => {
    return Object.assign(properties, propertiesForOutletDefinition(outletDefinition));
  }, {});
}
function getOutletController(controller, element, identifier) {
  return controller.application.getControllerForElementAndIdentifier(element, identifier);
}
function getControllerAndEnsureConnectedScope(controller, element, outletName) {
  let outletController = getOutletController(controller, element, outletName);
  if (outletController)
    return outletController;
  controller.application.router.proposeToConnectScopeForElementAndIdentifier(element, outletName);
  outletController = getOutletController(controller, element, outletName);
  if (outletController)
    return outletController;
}
function propertiesForOutletDefinition(name) {
  const camelizedName = namespaceCamelize(name);
  return {
    [`${camelizedName}Outlet`]: {
      get() {
        const outletElement = this.outlets.find(name);
        const selector = this.outlets.getSelectorForOutletName(name);
        if (outletElement) {
          const outletController = getControllerAndEnsureConnectedScope(this, outletElement, name);
          if (outletController)
            return outletController;
          throw new Error(`The provided outlet element is missing an outlet controller "${name}" instance for host controller "${this.identifier}"`);
        }
        throw new Error(`Missing outlet element "${name}" for host controller "${this.identifier}". Stimulus couldn't find a matching outlet element using selector "${selector}".`);
      }
    },
    [`${camelizedName}Outlets`]: {
      get() {
        const outlets = this.outlets.findAll(name);
        if (outlets.length > 0) {
          return outlets.map((outletElement) => {
            const outletController = getControllerAndEnsureConnectedScope(this, outletElement, name);
            if (outletController)
              return outletController;
            console.warn(`The provided outlet element is missing an outlet controller "${name}" instance for host controller "${this.identifier}"`, outletElement);
          }).filter((controller) => controller);
        }
        return [];
      }
    },
    [`${camelizedName}OutletElement`]: {
      get() {
        const outletElement = this.outlets.find(name);
        const selector = this.outlets.getSelectorForOutletName(name);
        if (outletElement) {
          return outletElement;
        } else {
          throw new Error(`Missing outlet element "${name}" for host controller "${this.identifier}". Stimulus couldn't find a matching outlet element using selector "${selector}".`);
        }
      }
    },
    [`${camelizedName}OutletElements`]: {
      get() {
        return this.outlets.findAll(name);
      }
    },
    [`has${capitalize(camelizedName)}Outlet`]: {
      get() {
        return this.outlets.has(name);
      }
    }
  };
}
function TargetPropertiesBlessing(constructor) {
  const targets = readInheritableStaticArrayValues(constructor, "targets");
  return targets.reduce((properties, targetDefinition) => {
    return Object.assign(properties, propertiesForTargetDefinition(targetDefinition));
  }, {});
}
function propertiesForTargetDefinition(name) {
  return {
    [`${name}Target`]: {
      get() {
        const target = this.targets.find(name);
        if (target) {
          return target;
        } else {
          throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
        }
      }
    },
    [`${name}Targets`]: {
      get() {
        return this.targets.findAll(name);
      }
    },
    [`has${capitalize(name)}Target`]: {
      get() {
        return this.targets.has(name);
      }
    }
  };
}
function ValuePropertiesBlessing(constructor) {
  const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, "values");
  const propertyDescriptorMap = {
    valueDescriptorMap: {
      get() {
        return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
          const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair, this.identifier);
          const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
          return Object.assign(result, { [attributeName]: valueDescriptor });
        }, {});
      }
    }
  };
  return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
    return Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair));
  }, propertyDescriptorMap);
}
function propertiesForValueDefinitionPair(valueDefinitionPair, controller) {
  const definition = parseValueDefinitionPair(valueDefinitionPair, controller);
  const { key, name, reader: read, writer: write } = definition;
  return {
    [name]: {
      get() {
        const value = this.data.get(key);
        if (value !== null) {
          return read(value);
        } else {
          return definition.defaultValue;
        }
      },
      set(value) {
        if (value === void 0) {
          this.data.delete(key);
        } else {
          this.data.set(key, write(value));
        }
      }
    },
    [`has${capitalize(name)}`]: {
      get() {
        return this.data.has(key) || definition.hasCustomDefaultValue;
      }
    }
  };
}
function parseValueDefinitionPair([token, typeDefinition], controller) {
  return valueDescriptorForTokenAndTypeDefinition({
    controller,
    token,
    typeDefinition
  });
}
function parseValueTypeConstant(constant) {
  switch (constant) {
    case Array:
      return "array";
    case Boolean:
      return "boolean";
    case Number:
      return "number";
    case Object:
      return "object";
    case String:
      return "string";
  }
}
function parseValueTypeDefault(defaultValue) {
  switch (typeof defaultValue) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
  }
  if (Array.isArray(defaultValue))
    return "array";
  if (Object.prototype.toString.call(defaultValue) === "[object Object]")
    return "object";
}
function parseValueTypeObject(payload) {
  const { controller, token, typeObject } = payload;
  const hasType = isSomething(typeObject.type);
  const hasDefault = isSomething(typeObject.default);
  const fullObject = hasType && hasDefault;
  const onlyType = hasType && !hasDefault;
  const onlyDefault = !hasType && hasDefault;
  const typeFromObject = parseValueTypeConstant(typeObject.type);
  const typeFromDefaultValue = parseValueTypeDefault(payload.typeObject.default);
  if (onlyType)
    return typeFromObject;
  if (onlyDefault)
    return typeFromDefaultValue;
  if (typeFromObject !== typeFromDefaultValue) {
    const propertyPath = controller ? `${controller}.${token}` : token;
    throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${typeObject.default}" is of type "${typeFromDefaultValue}".`);
  }
  if (fullObject)
    return typeFromObject;
}
function parseValueTypeDefinition(payload) {
  const { controller, token, typeDefinition } = payload;
  const typeObject = { controller, token, typeObject: typeDefinition };
  const typeFromObject = parseValueTypeObject(typeObject);
  const typeFromDefaultValue = parseValueTypeDefault(typeDefinition);
  const typeFromConstant = parseValueTypeConstant(typeDefinition);
  const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
  if (type)
    return type;
  const propertyPath = controller ? `${controller}.${typeDefinition}` : token;
  throw new Error(`Unknown value type "${propertyPath}" for "${token}" value`);
}
function defaultValueForDefinition(typeDefinition) {
  const constant = parseValueTypeConstant(typeDefinition);
  if (constant)
    return defaultValuesByType[constant];
  const hasDefault = hasProperty(typeDefinition, "default");
  const hasType = hasProperty(typeDefinition, "type");
  const typeObject = typeDefinition;
  if (hasDefault)
    return typeObject.default;
  if (hasType) {
    const { type } = typeObject;
    const constantFromType = parseValueTypeConstant(type);
    if (constantFromType)
      return defaultValuesByType[constantFromType];
  }
  return typeDefinition;
}
function valueDescriptorForTokenAndTypeDefinition(payload) {
  const { token, typeDefinition } = payload;
  const key = `${dasherize(token)}-value`;
  const type = parseValueTypeDefinition(payload);
  return {
    type,
    key,
    name: camelize(key),
    get defaultValue() {
      return defaultValueForDefinition(typeDefinition);
    },
    get hasCustomDefaultValue() {
      return parseValueTypeDefault(typeDefinition) !== void 0;
    },
    reader: readers[type],
    writer: writers[type] || writers.default
  };
}
var defaultValuesByType = {
  get array() {
    return [];
  },
  boolean: false,
  number: 0,
  get object() {
    return {};
  },
  string: ""
};
var readers = {
  array(value) {
    const array = JSON.parse(value);
    if (!Array.isArray(array)) {
      throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault(array)}"`);
    }
    return array;
  },
  boolean(value) {
    return !(value == "0" || String(value).toLowerCase() == "false");
  },
  number(value) {
    return Number(value.replace(/_/g, ""));
  },
  object(value) {
    const object = JSON.parse(value);
    if (object === null || typeof object != "object" || Array.isArray(object)) {
      throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault(object)}"`);
    }
    return object;
  },
  string(value) {
    return value;
  }
};
var writers = {
  default: writeString,
  array: writeJSON,
  object: writeJSON
};
function writeJSON(value) {
  return JSON.stringify(value);
}
function writeString(value) {
  return `${value}`;
}
var Controller = class {
  constructor(context) {
    this.context = context;
  }
  static get shouldLoad() {
    return true;
  }
  static afterLoad(_identifier, _application) {
    return;
  }
  get application() {
    return this.context.application;
  }
  get scope() {
    return this.context.scope;
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get targets() {
    return this.scope.targets;
  }
  get outlets() {
    return this.scope.outlets;
  }
  get classes() {
    return this.scope.classes;
  }
  get data() {
    return this.scope.data;
  }
  initialize() {
  }
  connect() {
  }
  disconnect() {
  }
  dispatch(eventName, { target = this.element, detail = {}, prefix = this.identifier, bubbles = true, cancelable = true } = {}) {
    const type = prefix ? `${prefix}:${eventName}` : eventName;
    const event = new CustomEvent(type, { detail, bubbles, cancelable });
    target.dispatchEvent(event);
    return event;
  }
};
Controller.blessings = [
  ClassPropertiesBlessing,
  TargetPropertiesBlessing,
  ValuePropertiesBlessing,
  OutletPropertiesBlessing
];
Controller.targets = [];
Controller.outlets = [];
Controller.values = {};

// app/javascript/gameplay/movement_type.js
var MovementType = class {
  constructor({
    boundaryCheck,
    rangeLimit,
    increment,
    additionalActions,
    pieceNotation
    //, captureNotation: captureNotation
  }) {
    this.boundaryCheck = boundaryCheck;
    this.increment = increment;
    this.additionalActions = additionalActions;
    this.rangeLimit = rangeLimit;
    this.pieceNotation = pieceNotation || "";
  }
};
var movement_type_default = MovementType;

// app/javascript/gameplay/layout.js
var Layout = class {
  static default() {
    let layOut = [
      board_default.WHITE_ROOK,
      board_default.WHITE_NIGHT,
      board_default.WHITE_BISHOP,
      board_default.WHITE_QUEEN,
      board_default.WHITE_KING,
      board_default.WHITE_BISHOP,
      board_default.WHITE_NIGHT,
      board_default.WHITE_ROOK,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_ROOK,
      board_default.BLACK_NIGHT,
      board_default.BLACK_BISHOP,
      board_default.BLACK_QUEEN,
      board_default.BLACK_KING,
      board_default.BLACK_BISHOP,
      board_default.BLACK_NIGHT,
      board_default.BLACK_ROOK
    ];
    return layOut;
  }
  static weightTesting() {
    let layOut = [
      board_default.WHITE_ROOK,
      board_default.WHITE_NIGHT,
      board_default.WHITE_BISHOP,
      board_default.WHITE_QUEEN,
      board_default.WHITE_KING,
      board_default.WHITE_BISHOP,
      board_default.WHITE_NIGHT,
      board_default.WHITE_ROOK,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_ROOK,
      board_default.BLACK_NIGHT,
      board_default.BLACK_BISHOP,
      board_default.BLACK_QUEEN,
      board_default.BLACK_KING,
      board_default.BLACK_BISHOP,
      board_default.BLACK_NIGHT,
      board_default.BLACK_ROOK
    ];
    return layOut;
  }
  static approachingStale() {
    let layOut = [
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_KING,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_PAWN,
      board_default.WHITE_NIGHT,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_ROOK,
      board_default.WHITE_PAWN,
      board_default.WHITE_BISHOP,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_QUEEN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_KING,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_ROOK
    ];
    return layOut;
  }
  static approachingMate() {
    let layOut = [
      board_default.WHITE_ROOK,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_BISHOP,
      board_default.WHITE_QUEEN,
      board_default.WHITE_KING,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_NIGHT,
      board_default.WHITE_ROOK,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.WHITE_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_NIGHT,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.WHITE_BISHOP,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_NIGHT,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.EMPTY_SQUARE,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_PAWN,
      board_default.BLACK_ROOK,
      board_default.EMPTY_SQUARE,
      board_default.BLACK_BISHOP,
      board_default.BLACK_QUEEN,
      board_default.BLACK_KING,
      board_default.BLACK_BISHOP,
      board_default.BLACK_NIGHT,
      board_default.BLACK_ROOK
    ];
    return layOut;
  }
};
var layout_default = Layout;

// app/javascript/gameplay/board.js
var Board2 = class _Board {
  // TODO might be easier to store the moveObjects and recreate noatation on demand!!!
  constructor({ layOut, capturedPieces, gameOver, allowedToMove, movementNotation, previousLayouts }) {
    this.layOut = layOut || layout_default.default();
    this.capturedPieces = capturedPieces || [];
    this.gameOver = gameOver || false;
    this.allowedToMove = allowedToMove || _Board.WHITE;
    this.movementNotation = movementNotation || [];
    this.previousLayouts = previousLayouts || JSON.stringify([]);
  }
  static get WHITE() {
    return "W";
  }
  static get BLACK() {
    return "B";
  }
  static get EMPTY() {
    return "e";
  }
  static get PAWN() {
    return "P";
  }
  static get ROOK() {
    return "R";
  }
  static get NIGHT() {
    return "N";
  }
  static get BISHOP() {
    return "B";
  }
  static get QUEEN() {
    return "Q";
  }
  static get KING() {
    return "K";
  }
  static get EMPTY_SQUARE() {
    return this.EMPTY + this.EMPTY;
  }
  static get BLACK_PAWN() {
    return this.BLACK + this.PAWN;
  }
  static get BLACK_ROOK() {
    return this.BLACK + this.ROOK;
  }
  static get BLACK_NIGHT() {
    return this.BLACK + this.NIGHT;
  }
  static get BLACK_BISHOP() {
    return this.BLACK + this.BISHOP;
  }
  static get BLACK_KING() {
    return this.BLACK + this.KING;
  }
  static get BLACK_QUEEN() {
    return this.BLACK + this.QUEEN;
  }
  static get WHITE_PAWN() {
    return this.WHITE + this.PAWN;
  }
  static get WHITE_ROOK() {
    return this.WHITE + this.ROOK;
  }
  static get WHITE_NIGHT() {
    return this.WHITE + this.NIGHT;
  }
  static get WHITE_BISHOP() {
    return this.WHITE + this.BISHOP;
  }
  static get WHITE_KING() {
    return this.WHITE + this.KING;
  }
  static get WHITE_QUEEN() {
    return this.WHITE + this.QUEEN;
  }
  static get DARK() {
    return "dark";
  }
  static get LIGHT() {
    return "light";
  }
  static get MINOR_PIECES() {
    return [_Board.NIGHT, _Board.BISHOP];
  }
  static get MAJOR_PIECES() {
    return [_Board.ROOK, _Board.QUEEN];
  }
  static _boundaries() {
    return { upperLimit: 63, lowerLimit: 0 };
  }
  static _deepCopy(originalObject) {
    let newObject = [];
    for (let i = 0; i < originalObject.length; i++) {
      newObject.push(originalObject[i]);
    }
    return newObject;
  }
  static isSeventhRank(position) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    return Math.floor(position / 8) === 6;
  }
  static isSecondRank(position) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    return Math.floor(position / 8) === 1;
  }
  static rank(position) {
    return Math.floor(position / 8) + 1;
  }
  static file(position) {
    let files = "abcdefgh";
    return files[position % 8];
  }
  static squareColor(position) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    let div = Math.floor(position / 8), mod = position % 8, sum = div + mod, squareColor = "";
    if (sum % 2 === 0) {
      squareColor = _Board.DARK;
    } else {
      squareColor = _Board.LIGHT;
    }
    return squareColor;
  }
  static opposingTeam(teamString) {
    if (teamString === _Board.WHITE) {
      return _Board.BLACK;
    } else {
      return _Board.WHITE;
    }
    ;
  }
  static gridCalculator(position) {
    let x = Math.floor(position % 8), y = Math.floor(position / 8) + 1, alphaNum = {
      0: "a",
      1: "b",
      2: "c",
      3: "d",
      4: "e",
      5: "f",
      6: "g",
      7: "h"
    };
    return alphaNum[x] + y;
  }
  static gridCalculatorReverse(alphaNumericPosition) {
    let letter = alphaNumericPosition[0], number = alphaNumericPosition[1], alphaNum = {
      a: 0,
      b: 1,
      c: 2,
      d: 3,
      e: 4,
      f: 5,
      g: 6,
      h: 7
    }, file = alphaNum[letter], rank = (number - 1) * 8;
    return rank + file;
  }
  static _inBounds(position) {
    return position <= this._boundaries().upperLimit && position >= this._boundaries().lowerLimit;
  }
  static parseTeam(string) {
    return string[0];
  }
  static parseSpecies(string) {
    return string[1];
  }
  _nextTurn() {
    if (this.allowedToMove === _Board.WHITE) {
      this._prepareBlackTurn();
    } else {
      this._prepareWhiteTurn();
    }
  }
  _prepareBlackTurn() {
    this.allowedToMove = _Board.BLACK;
  }
  _prepareWhiteTurn() {
    this.allowedToMove = _Board.WHITE;
  }
  _undo() {
    let parsedPrevious = JSON.parse(this.previousLayouts);
    this.layOut = parsedPrevious.pop();
    this.previousLayouts = JSON.stringify(parsedPrevious);
    let undoneNotation = this.movementNotation.pop(), captureNotationMatch = undoneNotation.match(/x/);
    if (captureNotationMatch) {
      this.capturedPieces.pop();
    }
    this._nextTurn();
  }
  remainingPieceValueFor(team) {
    let subtractedValue = 0, captures = this.capturedPieces;
    for (let i = 0; i < captures.length; i++) {
      let piece = captures[i];
      if (_Board.parseTeam(piece) === team) {
        subtractedValue = subtractedValue + _Board.pieceValues()[_Board.parseSpecies(piece)];
      }
    }
    return 39 - subtractedValue;
  }
  static pieceValues() {
    let values = {};
    values[_Board.PAWN] = 1;
    values[_Board.NIGHT] = 3;
    values[_Board.BISHOP] = 3;
    values[_Board.ROOK] = 5;
    values[_Board.QUEEN] = 9;
    values[_Board.KING] = 0;
    return values;
  }
  consoleLogBlackPov() {
    for (let i = 0; i < 64; i = i + 8) {
      let row = "";
      for (let j = 0; j < 8; j++) {
        let pieceObject = this.pieceObject(i + j);
        if (_Board.parseTeam(pieceObject) === _Board.EMPTY) {
          var text = "  __  ";
        } else {
          var text = "  " + _Board.parseTeam(pieceObject)[0] + _Board.parseSpecies(pieceObject)[0] + "  ";
        }
        row = row + text;
      }
      console.log(row);
      console.log(" ");
    }
  }
  consoleLogWhitePov() {
    for (let i = 56; i > -1; i = i - 8) {
      let row = "";
      for (let j = 0; j < 8; j++) {
        let pieceObject = this.pieceObject(i + j);
        if (_Board.parseTeam(pieceObject) === _Board.EMPTY) {
          var text = "  __  ";
        } else {
          var text = "  " + _Board.parseTeam(pieceObject)[0] + _Board.parseSpecies(pieceObject)[0] + "  ";
        }
        row = row + text;
      }
      console.log(row);
      console.log(" ");
    }
  }
  static convertPositionFromAlphaNumeric(position) {
    if (typeof position === "string" && position.match(/[a-z]\d/) && position.length === 2) {
      return _Board.gridCalculatorReverse(position);
    } else {
      return position;
    }
  }
  _blackPawnAt(position) {
    return _Board.parseTeam(this.pieceObject(position)) === _Board.BLACK && _Board.parseSpecies(this.pieceObject(position)) === _Board.PAWN;
  }
  _whitePawnAt(position) {
    return _Board.parseTeam(this.pieceObject(position)) === _Board.WHITE && _Board.parseSpecies(this.pieceObject(position)) === _Board.PAWN;
  }
  blackPawnDoubleSteppedTo(position) {
    var result;
    let blackMoves = this.movesNotationFor(_Board.BLACK), square = _Board.gridCalculator(position), hypotheticalSingleStepSquare = square[0] + "6";
    if (blackMoves[blackMoves.length - 1] === square) {
      result = true;
    } else {
      return false;
    }
    for (let i = 0; i < blackMoves; i < blackMoves.length) {
      if (blackMoves[i] === hypotheticalSingleStepSquare || blackMoves[i] === hypotheticalSingleStepSquare + "+") {
        result = false;
        break;
      }
    }
    return result;
  }
  whitePawnDoubleSteppedTo(position) {
    var result;
    let whiteMoves = this.movesNotationFor(_Board.WHITE), square = _Board.gridCalculator(position), hypotheticalSingleStepSquare = square[0] + "3";
    if (whiteMoves[whiteMoves.length - 1] === square) {
      result = true;
    } else {
      return false;
    }
    for (let i = 0; i < whiteMoves; i < whiteMoves.length) {
      if (whiteMoves[i] === hypotheticalSingleStepSquare || whiteMoves[i] === hypotheticalSingleStepSquare + "+") {
        result = false;
        break;
      }
    }
    return result;
  }
  movesNotationFor(team) {
    let teamMoves = [];
    if (team === _Board.WHITE) {
      var initialElement = 0;
    } else if (team === _Board.BLACK) {
      var initialElement = 1;
    } else {
      alert("bad input for board.movesNotationFor: " + team);
    }
    for (let i = initialElement; i < this.movementNotation.length; i = i + 2) {
      teamMoves.push(this.movementNotation[i]);
    }
    return teamMoves;
  }
  deepCopy() {
    let newLayout = _Board._deepCopy(this.layOut), newCaptures = _Board._deepCopy(this.capturedPieces), newMovementNotation = _Board._deepCopy(this.movementNotation), newBoard = new _Board({ layOut: newLayout, capturedPieces: newCaptures, allowedToMove: this.allowedToMove, gameOver: this.gameOver, movementNotation: newMovementNotation, previousLayouts: this.previousLayouts });
    return newBoard;
  }
  _reset() {
    this.layOut = layout_default.default();
    this.capturedPieces = [];
    this.gameOver = false;
    this.allowedToMove = _Board.WHITE;
    this.movementNotation = [];
  }
  _endGame(team) {
    this.gameOver = true;
    this._winner = team;
  }
  teamNotMoving() {
    let teamNotMoving;
    if (this.allowedToMove === _Board.WHITE) {
      teamNotMoving = _Board.BLACK;
    } else {
      teamNotMoving = _Board.WHITE;
    }
    return teamNotMoving;
  }
  _recordNotationFrom({ moveObject, epNotation, notationSuffix }) {
    let pieceNotation = moveObject.pieceNotation;
    if (/[QNBR]/.exec(pieceNotation)) {
    }
    this.movementNotation.push(moveObject.notation() + (epNotation || "") + notationSuffix);
  }
  _hypotheticallyMovePiece(moveObject) {
    let startPosition = moveObject.startPosition, endPosition = moveObject.endPosition, additionalActions = moveObject.additionalActions;
    let pieceObject = this.pieceObject(startPosition);
    this._emptify(startPosition);
    this._placePiece({ position: endPosition, pieceObject });
    if (additionalActions) {
      additionalActions.call(this, startPosition);
    }
  }
  _officiallyMovePiece(moveObject) {
    let startPosition = moveObject.startPosition, endPosition = moveObject.endPosition, additionalActions = moveObject.additionalActions, pieceObject = this.pieceObject(startPosition);
    let stringyLayOut = JSON.stringify(this.layOut);
    if (/,/.exec(this.previousLayouts)) {
      this.previousLayouts = this.previousLayouts.replace(/]$/, "," + stringyLayOut + "]");
    } else {
      this.previousLayouts = "[" + stringyLayOut + "]";
    }
    this._emptify(startPosition);
    if (!this.positionEmpty(endPosition)) {
      this._capture(endPosition);
    }
    this._placePiece({ position: endPosition, pieceObject });
    if (additionalActions) {
      var epNotation = additionalActions.call(this, startPosition);
    }
    let prefixNotation = moveObject.notation();
    let notationSuffix = rules_default.postMoveQueries(this, prefixNotation);
    this._recordNotationFrom({ moveObject, epNotation: epNotation || "", notationSuffix });
    if (!this.gameOver) {
      this._nextTurn();
    }
  }
  _capture(position) {
    let pieceObject = this.layOut[position];
    this.capturedPieces.push(pieceObject);
  }
  _oneSpaceDownIsEmpty(position) {
    return this.positionEmpty(position - 8);
  }
  _twoSpacesDownIsEmpty(position) {
    return this.positionEmpty(position - 16);
  }
  _downAndLeftIsAttackable(startPosition) {
    let positionDownAndLeft = startPosition - 9;
    if (_Board._inBounds(positionDownAndLeft)) {
      let pieceObject = this.layOut[positionDownAndLeft], pieceTeam = _Board.parseTeam(pieceObject);
      return this.occupiedByOpponent({ position: positionDownAndLeft, teamString: _Board.BLACK }) && _Board.squareColor(startPosition) === _Board.squareColor(positionDownAndLeft);
    } else {
      return false;
    }
  }
  _downAndRightIsAttackable(startPosition) {
    let positionDownAndRight = startPosition - 7;
    if (_Board._inBounds(positionDownAndRight)) {
      let pieceObject = this.layOut[positionDownAndRight], pieceTeam = _Board.parseTeam(pieceObject);
      return this.occupiedByOpponent({ position: positionDownAndRight, teamString: _Board.BLACK }) && _Board.squareColor(startPosition) === _Board.squareColor(positionDownAndRight);
    } else {
      return false;
    }
  }
  _twoSpacesUpIsEmpty(position) {
    return this.positionEmpty(position + 16);
  }
  _oneSpaceUpIsEmpty(position) {
    return this.positionEmpty(position + 8);
  }
  _upAndLeftIsAttackable(startPosition) {
    let positionUpAndLeft = startPosition + 7;
    if (_Board._inBounds(positionUpAndLeft)) {
      let pieceObject = this.pieceObject(positionUpAndLeft), pieceTeam = _Board.parseTeam(pieceObject);
      return this.occupiedByOpponent({ position: positionUpAndLeft, teamString: _Board.WHITE }) && _Board.squareColor(startPosition) === _Board.squareColor(positionUpAndLeft);
    } else {
      return false;
    }
  }
  _upAndRightIsAttackable(startPosition) {
    let positionUpAndRight = startPosition + 9;
    if (_Board._inBounds(positionUpAndRight)) {
      let pieceObject = this.layOut[positionUpAndRight], pieceTeam = _Board.parseTeam(pieceObject);
      return this.occupiedByOpponent({ position: positionUpAndRight, teamString: _Board.WHITE }) && _Board.squareColor(startPosition) === _Board.squareColor(positionUpAndRight);
    } else {
      return false;
    }
  }
  // static backRankFor(team){
  //   let rankArray = {
  //     black: 8,
  //     white: 1
  //   }
  //   return rankArray[team]
  // }
  kingSideCastleViableFor(team, startPosition) {
    if (this.pieceObject(startPosition + 3) !== team + _Board.ROOK) {
      return false;
    }
    if (rules_default.checkQuery({ board: this, teamString: this.allowedToMove })) {
      return false;
    }
    let moveNotations = this.movesNotationFor(team), regexes = [/Rh/, /Rg/, /Rf/];
    if (team === _Board.WHITE) {
      if (startPosition !== 4) {
        return false;
      }
      var necessaryEmptyPositions = [5, 6];
      regexes.push(/Ke2/, /Kd1/, /Kd2/, /Kf1/, /Kf2/, /Kg1/, /Kc1/);
    } else if (team === _Board.BLACK) {
      if (startPosition !== 60) {
        return false;
      }
      var necessaryEmptyPositions = [61, 62];
      regexes.push(/Ke7/, /Kd8/, /Kd7/, /Kf8/, /Kf7/, /Kg8/, /Kc8/);
    } else {
      alert("bad input for board.kingSideCastleViableFor :" + team);
    }
    for (let i = 0; i < necessaryEmptyPositions.length; i++) {
      let necessaryEmptyPosition = necessaryEmptyPositions[i];
      if (!this.positionEmpty(necessaryEmptyPosition)) {
        return false;
      }
    }
    for (let j = 0; j < moveNotations.length; j++) {
      let notation = moveNotations[j];
      for (let i = 0; i < regexes.length; i++) {
        let regex = regexes[i];
        if (regex.exec(notation)) {
          return false;
        }
      }
    }
    return true;
  }
  queenSideCastleViableFor(team, startPosition) {
    if (this.pieceObject(startPosition - 4) !== team + _Board.ROOK) {
      return false;
    }
    if (rules_default.checkQuery({ board: this, teamString: this.allowedToMove })) {
      return false;
    }
    let moveNotations = this.movesNotationFor(team), regexes = [/Ra/, /Rb/, /Rc/, /Rd/];
    if (team === _Board.WHITE) {
      if (startPosition !== 4) {
        return false;
      }
      var necessaryEmptyPositions = [1, 2, 3];
      regexes.push(/Ke2/, /Kd1/, /Kd2/, /Kf1/, /Kf2/, /Kg1/, /Kc1/);
    } else if (team === _Board.BLACK) {
      if (startPosition !== 60) {
        return false;
      }
      var necessaryEmptyPositions = [59, 58, 57];
      regexes.push(/Ke7/, /Kd8/, /Kd7/, /Kf8/, /Kf7/, /Kg8/, /Kc8/);
    } else {
      alert("bad input for board.kingSideCastleViableFor :" + team);
    }
    for (let i = 0; i < necessaryEmptyPositions.length; i++) {
      let necessaryEmptyPosition = necessaryEmptyPositions[i];
      if (!this.positionEmpty(necessaryEmptyPosition)) {
        return false;
      }
    }
    for (let j = 0; j < moveNotations.length; j++) {
      let notation = moveNotations[j];
      for (let i = 0; i < regexes.length; i++) {
        let regex = regexes[i];
        if (regex.exec(notation)) {
          return false;
        }
      }
    }
    return true;
  }
  _kingSideCastleIsClear(kingPosition) {
    return this.positionEmpty(kingPosition + 1) && this.positionEmpty(kingPosition + 2);
  }
  _queenSideCastleIsClear(kingPosition) {
    return this.positionEmpty(kingPosition - 1) && this.positionEmpty(kingPosition - 2) && this.positionEmpty(kingPosition - 3);
  }
  _kingSideRookHasNotMoved(kingPosition) {
    let kingSideRookStartPosition = kingPosition + 3;
    return this.pieceTypeAt(kingSideRookStartPosition) === _Board.ROOK && this.pieceHasNotMovedFrom(kingSideRookStartPosition);
  }
  _queenSideRookHasNotMoved(kingPosition) {
    let queenSideRookStartPosition = kingPosition - 4;
    return this.pieceTypeAt(queenSideRookStartPosition) === _Board.ROOK && this.pieceHasNotMovedFrom(queenSideRookStartPosition);
  }
  pieceObject(position) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    return this.layOut[position];
  }
  _emptify(position) {
    this.layOut[position] = _Board.EMPTY + _Board.EMPTY;
  }
  _placePiece({ position, pieceObject }) {
    this.layOut[position] = pieceObject;
  }
  _promotePawn(position) {
    let teamString = this.teamAt(position);
    this.layOut[position] = teamString + _Board.QUEEN;
  }
  teamAt(position) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    if (!_Board._inBounds(position)) {
      return _Board.EMPTY;
    }
    ;
    let pieceObject = this.pieceObject(position), teamString = _Board.parseTeam(pieceObject);
    return teamString;
  }
  positionsOccupiedByTeam(teamString) {
    let positions = this._positionsOccupiedByTeam(teamString), alphaNumericPositions = [];
    for (let i = 0; i < positions.length; i++) {
      alphaNumericPositions.push(_Board.gridCalculator(positions[i]));
    }
    return alphaNumericPositions;
  }
  _positionsOccupiedByOpponentOf(teamString) {
    let opposingTeam = _Board.opposingTeam(teamString);
    return this._positionsOccupiedByTeam(opposingTeam);
  }
  _positionsOccupiedByTeam(teamString) {
    let positions = [];
    for (let i = 0; i < this.layOut.length && positions.length < 16; i++) {
      let teamAt = this.teamAt(i);
      if (teamAt === teamString) {
        positions.push(i);
      }
      ;
    }
    ;
    return positions;
  }
  occupiedByTeamMate({ position, teamString }) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    let occupantTeam = this.teamAt(position);
    return teamString === occupantTeam;
  }
  occupiedByOpponent({ position, teamString }) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    let occupantTeam = this.teamAt(position);
    return !this.positionEmpty(position) && teamString !== occupantTeam;
  }
  positionEmpty(position) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    let pieceObject = this.pieceObject(position);
    return _Board.parseTeam(pieceObject) === _Board.EMPTY;
  }
  pieceTypeAt(position) {
    position = _Board.convertPositionFromAlphaNumeric(position);
    let pieceObject = this.pieceObject(position), pieceType = _Board.parseSpecies(pieceObject);
    return pieceType;
  }
  kingPosition(teamString) {
    let position = this._kingPosition(teamString);
    return _Board.gridCalculator(position);
  }
  _kingPosition(teamString) {
    let layOut = this.layOut, position = null;
    for (let i = 0; i < layOut.length; i++) {
      let teamAtPosition = this.teamAt(i), pieceType = this.pieceTypeAt(i);
      if (teamAtPosition === teamString && pieceType === _Board.KING) {
        position = i;
        break;
      }
    }
    return position;
  }
};
var board_default = Board2;

// app/javascript/gameplay/move_object.js
var MoveObject = class {
  constructor({
    endPosition,
    additionalActions,
    pieceNotation,
    illegal,
    startPosition,
    captureNotation
  }) {
    this.startPosition = startPosition;
    this.endPosition = endPosition;
    this.additionalActions = additionalActions;
    this.pieceNotation = pieceNotation;
    this.captureNotation = captureNotation;
    this.illegal = illegal;
  }
  notation() {
    if (!/O-O/.exec(this.pieceNotation)) {
      var positionNotation = board_default.gridCalculator(this.endPosition);
    }
    return this.pieceNotation + (this.captureNotation || "") + (positionNotation || "");
  }
};
var move_object_default = MoveObject;

// app/javascript/gameplay/moves_calculator.js
var MovesCalculator = class _MovesCalculator {
  constructor({
    startPosition,
    board,
    moveObjects,
    movementTypes,
    ignoreCastles
    //, countDefense: countDefense//, endPosition: endPosition
  }) {
    this.startPosition = startPosition;
    this.board = board;
    this.movementTypes = movementTypes || [];
    this.moveObjects = moveObjects || [];
    this.pieceType = this.board.pieceTypeAt(this.startPosition);
    this.viablePositions = {};
    this.ignoreCastles = ignoreCastles || false;
    this.addMovementTypes();
    this.calculateViablePositions();
  }
  // calculate form of motion by div modding start and end
  // check whether the piece at the start is in the list of pieces allowed to make such a movement
  // have some conditions under which pawns can move
  // also conditions for castling
  addMovementTypes() {
    let pieceSpecificMovements = _MovesCalculator.pieceSpecificMovements(this.pieceType);
    this.movementTypes = pieceSpecificMovements({ startPosition: this.startPosition, board: this.board, ignoreCastles: this.ignoreCastles });
  }
  calculateViablePositions() {
    let teamString = this.board.teamAt(this.startPosition);
    for (let i = 0; i < this.movementTypes.length; i++) {
      let movementType = this.movementTypes[i], increment = movementType.increment, rangeLimit = movementType.rangeLimit, boundaryCheck = movementType.boundaryCheck, additionalActions = movementType.additionalActions;
      for (let j = 1; j <= rangeLimit; j++) {
        let currentPosition = increment * j + this.startPosition;
        if (!boundaryCheck(j, increment, this.startPosition)) {
          break;
        }
        if (this.board.positionEmpty(currentPosition)) {
          this.moveObjects.push(new move_object_default({ additionalActions, endPosition: currentPosition, startPosition: this.startPosition, pieceNotation: movementType.pieceNotation, captureNotation: movementType.captureNotation }));
        } else if (this.board.occupiedByOpponent({ position: currentPosition, teamString })) {
          this.moveObjects.push(new move_object_default({ additionalActions, endPosition: currentPosition, startPosition: this.startPosition, pieceNotation: movementType.pieceNotation, captureNotation: "x" }));
          break;
        } else if (this.board.occupiedByTeamMate({ position: currentPosition, teamString })) {
          break;
        }
      }
    }
  }
  static get verticalUpIncrement() {
    return 8;
  }
  static get verticalDownIncrement() {
    return -8;
  }
  static get forwardSlashUpIncrement() {
    return 9;
  }
  static get forwardSlashDownIncrement() {
    return -9;
  }
  static get backSlashUpIncrement() {
    return 7;
  }
  static get backSlashDownIncrement() {
    return -7;
  }
  static get nightVerticalLeftUpIncrement() {
    return 15;
  }
  static get nightVerticalRightUpIncrement() {
    return 17;
  }
  static get nightHorizontalLeftUpIncrement() {
    return 6;
  }
  static get nightHorizontalRightUpIncrement() {
    return 10;
  }
  static get nightVerticalLeftDownIncrement() {
    return -15;
  }
  static get nightVerticalRightDownIncrement() {
    return -17;
  }
  static get nightHorizontalLeftDownIncrement() {
    return -6;
  }
  static get nightHorizontalRightDownIncrement() {
    return -10;
  }
  static get horizontalRightIncrement() {
    return 1;
  }
  static get horizontalLeftIncrement() {
    return -1;
  }
  // TODO this is a movementType Factory
  static genericMovements({ increment, rangeLimit, pieceNotation, startPosition }) {
    switch (increment) {
      case _MovesCalculator.verticalUpIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "+8",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ endPosition }).vertical();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.verticalDownIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "-8",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ endPosition }).vertical();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.forwardSlashUpIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "+9",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).diagonalRight();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.forwardSlashDownIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "-9",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).diagonalLeft();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.backSlashUpIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "+7",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).diagonalLeft();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.backSlashDownIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "-7",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).diagonalRight();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.horizontalRightIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "+1",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).horizontal();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.horizontalLeftIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "-1",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).horizontal();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.nightVerticalLeftUpIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "+15",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).nightVertical();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.nightVerticalRightUpIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "+17",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).nightVertical();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.nightHorizontalLeftUpIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "+6",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).nightHorizontal();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.nightHorizontalRightUpIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "+10",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).nightHorizontal();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.nightVerticalLeftDownIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "-15",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).nightVertical();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.nightVerticalRightDownIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "-17",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).nightVertical();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.nightHorizontalLeftDownIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "-6",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).nightHorizontal();
          }
        });
        return movementType;
        break;
      case _MovesCalculator.nightHorizontalRightDownIncrement:
        var movementType = new movement_type_default({
          rangeLimit,
          pieceNotation,
          startPosition,
          increment: "-10",
          boundaryCheck: function(i, increment2, startPosition2) {
            let endPosition = i * increment2 + startPosition2;
            return _MovesCalculator.boundaryChecks({ startPosition: startPosition2, endPosition }).nightHorizontal();
          }
        });
        return movementType;
        break;
    }
  }
  static boundaryChecks(args) {
    let startPosition = args["startPosition"], endPosition = args["endPosition"];
    return {
      diagonalRight: function() {
        return endPosition % 8 > startPosition % 8 && board_default._inBounds(endPosition);
      },
      vertical: function() {
        return board_default._inBounds(endPosition);
      },
      diagonalLeft: function() {
        return endPosition % 8 < startPosition % 8 && board_default._inBounds(endPosition);
      },
      nightVertical: function() {
        return Math.abs(endPosition % 8 - startPosition % 8) === 1 && board_default._inBounds(endPosition);
      },
      nightHorizontal: function() {
        return Math.abs(endPosition % 8 - startPosition % 8) === 2 && board_default._inBounds(endPosition);
      },
      horizontal: function() {
        return Math.floor(endPosition / 8) === Math.floor(startPosition / 8) && board_default._inBounds(endPosition);
      }
    };
  }
  static get allIncrements() {
    return [
      _MovesCalculator.verticalUpIncrement,
      _MovesCalculator.verticalDownIncrement,
      _MovesCalculator.forwardSlashUpIncrement,
      _MovesCalculator.forwardSlashDownIncrement,
      _MovesCalculator.backSlashUpIncrement,
      _MovesCalculator.backSlashDownIncrement,
      _MovesCalculator.nightVerticalLeftUpIncrement,
      _MovesCalculator.nightVerticalRightUpIncrement,
      _MovesCalculator.nightHorizontalLeftUpIncrement,
      _MovesCalculator.nightHorizontalRightUpIncrement,
      _MovesCalculator.nightVerticalLeftDownIncrement,
      _MovesCalculator.nightVerticalRightDownIncrement,
      _MovesCalculator.nightHorizontalLeftDownIncrement,
      _MovesCalculator.nightHorizontalRightDownIncrement,
      _MovesCalculator.horizontalRightIncrement,
      _MovesCalculator.horizontalLeftIncrement
    ];
  }
  static getCommonMoveObjects(arr1, arr2) {
    let commons = [];
    for (let i = 0; i < arr1.length; i++) {
      for (let j = 0; j < arr2.length; j++) {
        if (arr1[i].increment === arr2[j].increment && !commons.includes(arr1[i])) {
          commons.push(arr1[i]);
        }
      }
    }
    return commons;
  }
  static pieceSpecificMovements(species, differential) {
    switch (species) {
      case "P":
        return function({ board, startPosition }) {
          var movementTypes = [], teamString = board.teamAt(startPosition), colorVars = {
            B: {
              startRank: 7,
              nonAttackMove: _MovesCalculator.genericMovements({ increment: _MovesCalculator.verticalDownIncrement }),
              singleStepCheck: board._oneSpaceDownIsEmpty(startPosition),
              doubleStepCheck: board_default.isSeventhRank(startPosition) && board._twoSpacesDownIsEmpty(startPosition) && board._oneSpaceDownIsEmpty(startPosition),
              leftAttackCheck: board._downAndLeftIsAttackable(startPosition),
              leftAttackMove: _MovesCalculator.genericMovements({ increment: _MovesCalculator.forwardSlashDownIncrement }),
              rightAttackCheck: board._downAndRightIsAttackable(startPosition),
              rightAttackMove: _MovesCalculator.genericMovements({ increment: _MovesCalculator.backSlashDownIncrement }),
              rightEnPassantCheck: board_default.rank(startPosition) === 4 && board._whitePawnAt(startPosition + 1) && board.whitePawnDoubleSteppedTo(startPosition + 1),
              //board.whitePawnDoubleSteppedFrom(startPosition - 15),
              leftEnPassantCheck: board_default.rank(startPosition) === 4 && board._whitePawnAt(startPosition - 1) && board.whitePawnDoubleSteppedTo(startPosition - 1)
              // board.whitePawnDoubleSteppedFrom(startPosition - 17),
            },
            W: {
              startRank: 2,
              nonAttackMove: _MovesCalculator.genericMovements({ increment: _MovesCalculator.verticalUpIncrement }),
              singleStepCheck: board._oneSpaceUpIsEmpty(startPosition),
              doubleStepCheck: board_default.isSecondRank(startPosition) && board._twoSpacesUpIsEmpty(startPosition) && board._oneSpaceUpIsEmpty(startPosition),
              leftAttackCheck: board._upAndLeftIsAttackable(startPosition),
              leftAttackMove: _MovesCalculator.genericMovements({ increment: _MovesCalculator.backSlashUpIncrement }),
              rightAttackCheck: board._upAndRightIsAttackable(startPosition),
              rightAttackMove: _MovesCalculator.genericMovements({ increment: _MovesCalculator.forwardSlashUpIncrement }),
              leftEnPassantCheck: board_default.rank(startPosition) === 5 && board._blackPawnAt(startPosition - 1) && board.blackPawnDoubleSteppedTo(startPosition - 1),
              //board.blackPawnDoubleSteppedFrom(startPosition + 15),
              rightEnPassantCheck: board_default.rank(startPosition) === 5 && board._blackPawnAt(startPosition + 1) && board.blackPawnDoubleSteppedTo(startPosition + 1)
              //board.blackPawnDoubleSteppedFrom(startPosition + 17),
            }
          }, pawnVars = colorVars[teamString];
          if (pawnVars.doubleStepCheck) {
            let movementType = pawnVars.nonAttackMove;
            movementType.rangeLimit = 2;
            movementType.pieceNotation = "";
            movementType.startPosition = startPosition;
            movementTypes.push(movementType);
          } else if (pawnVars.singleStepCheck) {
            let movementType = pawnVars.nonAttackMove;
            movementType.rangeLimit = 1;
            movementType.pieceNotation = "";
            movementType.startPosition = startPosition;
            movementTypes.push(movementType);
          }
          if (pawnVars.leftAttackCheck) {
            let movementType = pawnVars.leftAttackMove;
            movementType.rangeLimit = 1;
            movementType.startPosition = startPosition;
            movementType.pieceNotation = board_default.file(startPosition);
            movementTypes.push(movementType);
          }
          if (pawnVars.rightAttackCheck) {
            let movementType = pawnVars.rightAttackMove;
            movementType.rangeLimit = 1;
            movementType.startPosition = startPosition;
            movementType.pieceNotation = board_default.file(startPosition);
            movementTypes.push(movementType);
          }
          if (pawnVars.rightEnPassantCheck) {
            let movementType = pawnVars.rightAttackMove;
            movementType.rangeLimit = 1;
            movementType.startPosition = startPosition;
            movementType.pieceNotation = board_default.file(startPosition);
            movementType.captureNotation = "x";
            movementType.additionalActions = function(startPosition2) {
              this._capture(startPosition2 + 1);
              this._emptify(startPosition2 + 1);
              return "e.p.";
            };
            movementTypes.push(movementType);
          }
          if (pawnVars.leftEnPassantCheck) {
            let movementType = pawnVars.leftAttackMove;
            movementType.rangeLimit = 1;
            movementType.startPosition = startPosition;
            movementType.pieceNotation = board_default.file(startPosition);
            movementType.captureNotation = "x";
            movementType.additionalActions = function(startPosition2) {
              this._capture(startPosition2 - 1);
              this._emptify(startPosition2 - 1);
              return "e.p.";
            };
            movementTypes.push(movementType);
          }
          return movementTypes;
        };
      case "N":
        return function({ board, startPosition }) {
          let pieceNotation = "N", rangeLimit = 1;
          var movementTypes = [
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.nightHorizontalRightDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.nightHorizontalLeftDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.nightVerticalRightDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.nightVerticalLeftDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.nightHorizontalRightUpIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.nightHorizontalLeftUpIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.nightVerticalRightUpIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.nightVerticalLeftUpIncrement })
          ];
          return movementTypes;
        };
        break;
      case "R":
        return function({ board, startPosition }) {
          let pieceNotation = "R", rangeLimit = 7;
          var movementTypes = [_MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.horizontalRightIncrement }), _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.horizontalLeftIncrement }), _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.verticalUpIncrement }), _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.verticalDownIncrement })];
          return movementTypes;
        };
        break;
      case "B":
        return function({ board, startPosition }) {
          let pieceNotation = "B", rangeLimit = 7;
          var movementTypes = [_MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.forwardSlashDownIncrement }), _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.forwardSlashUpIncrement }), _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.backSlashDownIncrement }), _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.backSlashUpIncrement })];
          return movementTypes;
        };
        break;
      case "Q":
        return function({ board, startPosition }) {
          let pieceNotation = "Q", rangeLimit = 7;
          var movementTypes = [
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.forwardSlashDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.forwardSlashUpIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.backSlashDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.backSlashUpIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.horizontalRightIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.horizontalLeftIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.verticalUpIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.verticalDownIncrement })
          ];
          return movementTypes;
        };
        break;
      case "K":
        return function({ board, startPosition, ignoreCastles }) {
          let pieceNotation = "K", rangeLimit = 1;
          var movementTypes = [
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.horizontalRightIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.horizontalLeftIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.verticalUpIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.verticalDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.forwardSlashDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.forwardSlashUpIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.backSlashDownIncrement }),
            _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.backSlashUpIncrement })
          ], team = board.teamAt(startPosition);
          if (!ignoreCastles && board.kingSideCastleViableFor(team, startPosition)) {
            let movementType = _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.horizontalLeftIncrement });
            movementType.increment = 2;
            movementType.rangeLimit = 1;
            movementType.pieceNotation = "O-O";
            movementType.startPosition = startPosition;
            movementType.additionalActions = function(startPosition2) {
              let rook = this.pieceObject(startPosition2 + 3);
              this._placePiece({ position: startPosition2 + 1, pieceObject: rook });
              this._emptify(startPosition2 + 3);
              return "";
            };
            movementTypes.push(movementType);
          }
          if (!ignoreCastles && board.queenSideCastleViableFor(team, startPosition)) {
            let movementType = _MovesCalculator.genericMovements({ startPosition, rangeLimit, pieceNotation, increment: _MovesCalculator.horizontalRightIncrement });
            movementType.increment = -2;
            movementType.rangeLimit = 1;
            movementType.pieceNotation = "O-O-O";
            movementType.startPosition = startPosition;
            movementType.additionalActions = function(startPosition2) {
              let rook = this.pieceObject(startPosition2 - 4);
              this._placePiece({ position: startPosition2 - 1, pieceObject: rook });
              this._emptify(startPosition2 - 4);
              return "";
            };
            movementTypes.push(movementType);
          }
          return movementTypes;
        };
        break;
    }
  }
};
var moves_calculator_default = MovesCalculator;

// app/javascript/gameplay/rules.js
var Rules = class _Rules {
  static getMoveObject(startPosition, endPosition, board) {
    let layOut = board.layOut, team = board.teamAt(startPosition), moveObject = new move_object_default({ illegal: true });
    if (team === board_default.EMPTY) {
      moveObject.alert = "that tile is empty";
      return moveObject;
    }
    if (team !== board.allowedToMove) {
      moveObject.alert = "other team's turn";
      return moveObject;
    }
    let moveObjects = new moves_calculator_default({ board, startPosition }).moveObjects;
    for (let i = 0; i < moveObjects.length; i++) {
      let currentMoveObject = moveObjects[i], queryPosition = currentMoveObject.endPosition;
      if (endPosition === queryPosition) {
        moveObject = currentMoveObject;
        if (this.checkQueryWithMove({ board, moveObject })) {
          moveObject.illegal = true;
        }
        break;
      }
    }
    return moveObject;
  }
  static checkQueryWithMove({ board, moveObject }) {
    let startPosition = moveObject.startPosition, teamString = board.teamAt(startPosition), newBoard = board.deepCopy();
    newBoard._hypotheticallyMovePiece(moveObject);
    return this.checkQuery({ board: newBoard, teamString });
  }
  static pieceWillBeAttackedAfterMove({ board, moveObject }) {
    let startPosition = moveObject.startPosition, teamString = board.teamAt(startPosition), newBoard = board.deepCopy();
    newBoard._hypotheticallyMovePiece(moveObject);
    return this.checkQuery({ board: newBoard, teamString });
  }
  static checkQuery({ board, teamString }) {
    let kingPosition = board._kingPosition(teamString);
    return this.pieceIsAttacked({ board, defensePosition: kingPosition });
  }
  static pieceIsAttacked({ board, defensePosition }) {
    let teamString = board.teamAt(defensePosition), opposingTeamString = board_default.opposingTeam(teamString), enemyPositions = board._positionsOccupiedByTeam(opposingTeamString);
    for (let i = 0; i < enemyPositions.length; i++) {
      let enemyPosition = enemyPositions[i], enemyPieceType = board.pieceTypeAt(enemyPosition), differential = defensePosition - enemyPosition;
      if (!(differential % 10 === 0 || differential % 8 === 0 || differential % 6 === 0 || differential % 7 === 0 || differential % 9 === 0 || differential % 15 === 0 || differential % 17 === 0 || Math.abs(differential) < 8)) {
        continue;
      }
      let movesCalculator = new moves_calculator_default({ board, startPosition: enemyPosition, ignoreCastles: true }), responseMoveObject = new move_object_default({ illegal: true });
      for (let i2 = 0; i2 < movesCalculator.moveObjects.length; i2++) {
        let currentMoveObject = movesCalculator.moveObjects[i2], endPosition = currentMoveObject.endPosition;
        if (endPosition === defensePosition) {
          responseMoveObject = currentMoveObject;
          break;
        }
      }
      if (!responseMoveObject.illegal) {
        return true;
      }
    }
    ;
  }
  static positionsControlledByTeam({ board, team }) {
    let occcupiedPositions = board.positionsOccupiedByTeam(team);
    for (let i = 0; i < occcupiedPositions.length; i++) {
    }
  }
  static availableMovesFrom({ board, startPosition }) {
    let moveObjects = new moves_calculator_default({ board, startPosition }).moveObjects, safeMoves = [];
    for (let i = 0; i < moveObjects.length; i++) {
      let moveObject = moveObjects[i];
      if (!this.checkQueryWithMove({ board, moveObject })) {
        safeMoves.push(moveObject);
      }
    }
    return safeMoves;
  }
  static viablePositionsFromKeysOnly({ board, startPosition }) {
    let movesCalculator = new moves_calculator_default({ board, startPosition }), keysOnly = [];
    for (let i = 0; i < movesCalculator.moveObjects.length; i++) {
      let moveObject = movesCalculator.moveObjects[i], endPosition = moveObject.endPosition;
      if (!this.checkQueryWithMove({ board, moveObject })) {
        keysOnly.push(endPosition);
      }
    }
    return keysOnly;
  }
  static pawnPromotionQuery(board) {
    for (let i = 0; i < 8; i++) {
      if (board._blackPawnAt(i)) {
        board._promotePawn(i);
        return "=Q";
      }
    }
    for (let i = 56; i < 64; i++) {
      if (board._whitePawnAt(i)) {
        board._promotePawn(i);
        return "=Q";
      }
    }
    return "";
  }
  static noLegalMoves(board) {
    let movingTeamString = board.allowedToMove, noLegalMoves = true;
    if (movingTeamString === board_default.BLACK) {
      var onDeckTeamString = board_default.WHITE;
    } else {
      var onDeckTeamString = board_default.BLACK;
    }
    let occcupiedPositions = board._positionsOccupiedByTeam(onDeckTeamString);
    for (let i = 0; i < occcupiedPositions.length && noLegalMoves; i++) {
      let startPosition = occcupiedPositions[i], movesCalculator = new moves_calculator_default({ board, startPosition });
      for (let i2 = 0; i2 < movesCalculator.moveObjects.length; i2++) {
        let moveObject = movesCalculator.moveObjects[i2];
        if (!this.checkQueryWithMove({ moveObject, board })) {
          noLegalMoves = false;
          break;
        }
      }
    }
    ;
    return noLegalMoves;
  }
  static getDuplicatesForThreeFold(arr) {
    var all = {};
    return arr.reduce(function(duplicates, value) {
      value = value.replace(/=[QRNB]/, "");
      value = value.replace(/\+/, "");
      if (/[RNBQ][a-h1-8][a-h]/.exec(value)) {
        value = value.replace(/[a-h1-8]/, "");
      }
      if (all[value]) {
        duplicates.push(value);
        all[value] = false;
      } else if (typeof all[value] == "undefined") {
        all[value] = true;
      }
      return duplicates;
    }, []);
  }
  static threeFoldRepetition(board, prefixNotation) {
    let notations = board_default._deepCopy(board.movementNotation), notationsSinceCaptureOrPromotion = [];
    notations.push(prefixNotation);
    for (let i = notations.length - 1; i >= 0; i--) {
      let notation = notations[i];
      notationsSinceCaptureOrPromotion.push(notation);
      if (/x/.exec(notation) || /^[a-h]/.exec(notation)) {
        break;
      }
    }
    let teamOneNotation = [], teamTwoNotation = [];
    for (let i = 0; i < notationsSinceCaptureOrPromotion.length; i++) {
      let notation = notationsSinceCaptureOrPromotion[i];
      if (i % 2 === 0) {
        teamOneNotation.push(notation);
      } else {
        teamTwoNotation.push(notation);
      }
    }
    let teamOneDuplicates = this.getDuplicatesForThreeFold(teamOneNotation), teamTwoDuplicates = this.getDuplicatesForThreeFold(teamTwoNotation);
    if (teamOneDuplicates.length < 2 || teamTwoDuplicates.length < 2) {
      return false;
    } else {
      let previousLayouts = JSON.parse(board.previousLayouts), repetitions = 0, threeFoldRepetition = false, currentLayOut = JSON.stringify(board.layOut);
      for (let i = 0; i < previousLayouts.length; i++) {
        let comparisonLayout = JSON.stringify(previousLayouts[i]);
        if (comparisonLayout === currentLayOut) {
          repetitions++;
        }
      }
      ;
      if (repetitions >= 2) {
        threeFoldRepetition = true;
      }
      return threeFoldRepetition;
    }
  }
  static postMoveQueries(board, prefixNotation) {
    let pawnPromotionNotation = _Rules.pawnPromotionQuery(board), otherTeam = board.teamNotMoving(), attackingTeam = board_default.opposingTeam(otherTeam), kingPosition = board._kingPosition(otherTeam), inCheck = this.checkQuery({ board, teamString: otherTeam }), noMoves = this.noLegalMoves(board), threeFold = this.threeFoldRepetition(board, prefixNotation);
    if (inCheck && noMoves) {
      board._endGame(attackingTeam);
      return pawnPromotionNotation + "#";
    }
    if (inCheck) {
      return pawnPromotionNotation + "+";
    }
    if (noMoves || threeFold) {
      board._endGame();
      return pawnPromotionNotation;
    }
    return pawnPromotionNotation;
  }
};
var rules_default = Rules;

// app/javascript/gameplay/api.js
var Api = class {
  constructor(args) {
    this._board = args["board"];
    this._gameController = args["gameController"];
  }
  consoleLogBlackPov() {
    this._board.consoleLogBlackPov();
  }
  consoleLogWhitePov() {
    this._board.consoleLogWhitePov();
  }
  whoseTurn() {
    return this._board.allowedToMove;
  }
  capturedPieces() {
    var captures = [];
    for (let i = 0; i < this._board.capturedPieces.length; i++) {
      captures.push(JSON.parse(this._board.capturedPieces[i]));
    }
    return captures;
  }
  movementNotation() {
    return this._board.movementNotation;
  }
  availableMovesDefault() {
    let movingTeam = this._board.allowedToMove;
    return this.availableMovesFor({ movingTeam, board: this._board });
  }
  availableMovesFor({ movingTeam, board }) {
    let positions = board._positionsOccupiedByTeam(movingTeam), availableMoves = [];
    for (let i = 0; i < positions.length; i++) {
      availableMoves = availableMoves.concat(this.availableMovesFrom({ board, position: positions[i] }));
    }
    return availableMoves;
  }
  availableMovesFrom({ position, board }) {
    return rules_default.availableMovesFrom({ board, startPosition: position });
  }
  attemptMove(moveObject) {
    this._gameController.attemptMove(moveObject.startPosition, moveObject.endPosition);
  }
  resultOfHypotheticalMove({ board, moveObject }) {
    let newBoard = board.deepCopy();
    newBoard._officiallyMovePiece(moveObject);
    return newBoard;
  }
  piecesAttackableByPieceAt(board, square) {
    let startPosition = Board.convertPositionFromAlphaNumeric(square);
    let viablePositions = rules_default.viablePositionsFromKeysOnly({ board, startPosition }), attackedPositions = {};
    for (let i = 0; i < viablePositions.length; i++) {
      let position = viablePositions[i];
      if (!board.positionEmpty(position)) {
        attackedPositions[Board.gridCalculator(position)] = board.pieceTypeAt(position);
      }
    }
    return attackedPositions;
  }
  piecesDefendedByPieceAt(square) {
  }
  piecesDefending(square) {
  }
  piecesAttacking(board, square) {
    let queryPositionString = String(Board.gridCalculatorReverse(square)), team = board.teamAt(square), enemyPositions = board._positionsOccupiedByOpponentOf(team), attackers = {};
    for (let i = 0; i < enemyPositions.length; i++) {
      let position = enemyPositions[i], attackedPositions = rules_default.viablePositionsFromKeysOnly({ board, startPosition: position });
      if (attackedPositions.includes(queryPositionString)) {
        attackers[Board.gridCalculator(position)] = board.pieceTypeAt(position);
      }
    }
    return attackers;
  }
  piecesHypotheticallyAttackableFromBy(square, pieceObject) {
  }
  piecesHypotheticallyDefendableFromBy(square, pieceObject) {
  }
  piecesAttackableByTeam(board, teamString) {
    let positions = board._positionsOccupiedByTeam(teamString), attackedPositions = {};
    for (let i = 0; i < positions.length; i++) {
      let position = positions[i], subsetOfAttackedPositions = this.piecesAttackableByPieceAt(board, position);
      Object.assign(attackedPositions, subsetOfAttackedPositions);
    }
    return attackedPositions;
  }
  undefendedPiecesAttackableByTeam(teamString) {
  }
  positionsHypotheticallyAttackablBy() {
  }
  // value of pieces for team on board
  // move is castle
  // move is en passant
  // move abandons defended position
  // move abandons attacking position (verify that it's not doing to for capture of said attack)
  // something to compare values of
  // move captures
  // move is defended
  // move is attacked
  // move creates new attacks
  // move creates new threats
  // positionsCurrentlyAttackedBy(team) doesn't care whether pawn attack position is occupied
};
var api_default = Api;

// app/javascript/gameplay/bot.js
var Bot = class _Bot {
  constructor(api, team) {
    this.api = api;
    this.homeTeam = team;
  }
  determineMove(args) {
    let board = args["board"], availableMoves = this.api.availableMovesDefault(), gamePhase = this.calculateGamePhase({ team: this.homeTeam, board }), weightMoves = this.gamePhasePriorities[gamePhase], weightedMoves = weightMoves({ moves: availableMoves, board, team: this.homeTeam });
    console.log("weightedMoves");
    console.log(weightedMoves);
    let moveIdeas = this.pickNweightiestMovesFrom(weightedMoves, 8);
    let move = moveIdeas[Math.floor(Math.random() * moveIdeas.length)];
    console.log(this.homeTeam);
    console.log(move);
    return move;
  }
  selectRandomMove() {
    let availableMoves = this.api.availableMovesDefault(), move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    return move;
  }
  pretendRandomMoveIsWeighted() {
    let move = this.selectRandomMove();
    return { 1: [move] };
  }
  get gamePhasePriorities() {
    return {
      opening: this.weightMovesForOpening.bind(this),
      middle: this.weightMovesForMiddle.bind(this),
      end: this.pretendRandomMoveIsWeighted.bind(this)
    };
  }
  calculateGamePhase({ team, board }) {
    let kingPosition = board.kingPosition(team);
    if (board.remainingPieceValueFor(board_default.opposingTeam(team)) <= 13) {
      return "end";
    } else if (!this.backRankHasMinorPieces({ team, board })) {
      return "middle";
    } else {
      return "opening";
    }
  }
  backRankHasMinorPieces({ team, board }) {
    let backRank = this.backRank({ team, board });
    for (let i = 0; i < backRank.length; i++) {
      let pieceObject = backRank[i], pieceSpecies = board_default.parseSpecies(pieceObject), pieceTeam = board_default.parseTeam(pieceObject);
      if (pieceTeam === team && board_default.MINOR_PIECES.includes(pieceSpecies)) {
        return true;
      }
    }
  }
  backRank({ team, board }) {
    if (team === board_default.WHITE) {
      var squares = ["a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1"];
    } else {
      var squares = ["a8", "b8", "c8", "d8", "e8", "f8", "g8", "h8"];
    }
    let backRankPieces = [];
    for (let i = 0; i < squares.length; i++) {
      let square = squares[i];
      backRankPieces.push(board.pieceObject(square));
    }
    return backRankPieces;
  }
  weightMovesForMiddle({ moves, board, team }) {
    let weightedMoves = {};
    for (let i = 0; i < moves.length; i++) {
      let move = moves[i], weight = 0, stackDeckForCastle = this.stackDeckForCastle(board, move, 40);
      weight = weight + stackDeckForCastle;
      weight = Math.round(weight * 100) / 100;
      if (weightedMoves[weight]) {
        weightedMoves[weight].push(moves[i]);
      } else {
        weightedMoves[weight] = [moves[i]];
      }
    }
    return weightedMoves;
  }
  weightMovesForOpening({ moves, board, team }) {
    let weightedMoves = {};
    for (let i = 0; i < moves.length; i++) {
      let move = moves[i], weight = 0, newBoard = this.api.resultOfHypotheticalMove({ board, moveObject: move }), newlyAvailableMoves = this.api.availableMovesFor({ movingTeam: team, board: newBoard }), accessibleSquaresWeight = this.weightAccessibleSquares(newlyAvailableMoves) - this.weightAccessibleSquares(moves), seekCheckMate = this.seekCheckMate(board, move, team), avoidCheckMate = this.avoidCheckMate(board, move, team), stackDeckForCastle = this.stackDeckForCastle(board, move, 20), limitNonCastleKingMoves = this.limitNonCastleKingMoves(board, move), discourageEarlyQueenMovement = this.discourageEarlyQueenMovement(board, move);
      weight = weight + accessibleSquaresWeight + stackDeckForCastle + limitNonCastleKingMoves + discourageEarlyQueenMovement + seekCheckMate;
      weight = Math.round(weight * 100) / 100;
      if (weightedMoves[weight]) {
        weightedMoves[weight].push(moves[i]);
      } else {
        weightedMoves[weight] = [moves[i]];
      }
    }
    return weightedMoves;
  }
  avoidCheckMate(board, move, team) {
  }
  logTime() {
    console.log(Math.floor(Date.now() / 1e3));
  }
  benchMarkRecursivelyProjectMoves(N) {
    this.logTime();
    let startTime = Math.floor(Date.now() / 1e3), moves = this.api.availableMovesDefault(), weights = {};
    for (let i = 0; i < moves.length; i++) {
      let move = moves[i], weight = this.recursivelyProjectMoves({ board: this.baseBoard, move, team: this.homeTeam, depth: N, iteration: 0 });
      if (weights[weight]) {
        weights[weight].push(move);
      } else {
        weights[weight] = [move];
      }
    }
    let endTime = Math.floor(Date.now() / 1e3);
    console.log(weights);
    console.log(endTime - startTime);
  }
  // recursivelyProjectMoves({board: board, move: move, depth: depth, iteration: iteration}){
  //   var value;
  //   let newBoard = this.api.resultOfHypotheticalMove({board: board, moveObject: move});
  //   if( newBoard._winner === this.homeTeam){
  //     // console.log("mate");
  //     return 1000
  //   } else if ( newBoard._winner === this.opponent ){
  //     // console.log("mate");
  //     return -1000
  //   } else if (iteration === depth || board.gameOver){
  //     return 0//accessibleSquaresWeight + opponentPieceValueDifferential - homeTeamPieceValueDifferential
  //   } else {
  //     iteration++
  //     let newlyAvailableMoves = this.api.availableMovesFor({movingTeam: newBoard.allowedToMove, board: newBoard});
  //     for( let i = 0; i < newlyAvailableMoves.length; i++){
  //       let move = moves[i]
  //       // var value = (value || 0) + this.recursivelyProjectMoves({board: newBoard, move: newlyAvailableMoves[i], depth: depth, iteration: iteration})
  //       if(!value ){
  //         value = this.recursivelyProjectMoves({board: newBoard, move: newlyAvailableMoves[i], depth: depth, iteration: iteration})
  //       } else {
  //         let latestValue = this.recursivelyProjectMoves({board: newBoard, move: newlyAvailableMoves[i], depth: depth, iteration: iteration})
  //         if ( value > latestValue ){ value = latestValue }
  //       }
  //     }
  //   }
  //   return value
  // }
  recursivelyProjectMoves({ board, move, depth, iteration }) {
    var value;
    let newBoard = this.api.resultOfHypotheticalMove({ board, moveObject: move });
    if (newBoard._winner === this.homeTeam) {
      return 1;
    } else if (newBoard._winner === board_default.opposingTeam(this.homeTeam)) {
      return -1;
    } else if (iteration === depth || board.gameOver) {
      return 0;
    } else {
      let newlyAvailableMoves = this.api.availableMovesFor({ movingTeam: newBoard.allowedToMove, board: newBoard });
      iteration++;
      for (let i = 0; i < newlyAvailableMoves.length; i++) {
        if (!value) {
          value = this.recursivelyProjectMoves({ board: newBoard, move: newlyAvailableMoves[i], depth, iteration });
        } else {
          let latestValue = this.recursivelyProjectMoves({ board: newBoard, move: newlyAvailableMoves[i], depth, iteration });
          if (latestValue > value) {
            value = latestValue;
          }
        }
      }
    }
    return value;
  }
  benchMarkRecursivelyProjectMoves2() {
    this.logTime();
    let startTime = Math.floor(Date.now() / 1e3);
    window.wins = [];
    window.losses = [];
    let v = this.recursivelyProjectMoves2({ board: this.baseBoard, depth: 3, iteration: 0 });
    let endTime = Math.floor(Date.now() / 1e3);
    console.lo(v);
    console.log(endTime - startTime);
  }
  recursivelyProjectMoves2({ board, depth, iteration }) {
    iteration++;
    let newlyAvailableMoves = this.api.availableMovesFor({ movingTeam: board.allowedToMove, board }), value = 0;
    for (let i = 0; i < newlyAvailableMoves.length; i++) {
      let move = newlyAvailableMoves[i], newBoard = this.api.resultOfHypotheticalMove({ board, moveObject: move });
      if (newBoard._winner === this.homeTeam) {
        window.wins.push(newBoard.movementNotation);
        value++;
      } else if (newBoard._winner === board_default.opposingTeam(this.homeTeam)) {
        window.losses.push(newBoard.movementNotation);
        value--;
      } else if (iteration === depth || board.gameOver) {
      } else {
        if (!value) {
          value = this.recursivelyProjectMoves2({ board: newBoard, move: newlyAvailableMoves[i], depth, iteration });
        } else {
          let latestValue = this.recursivelyProjectMoves2({ board: newBoard, move: newlyAvailableMoves[i], depth, iteration });
          if (latestValue < value) {
            value = latestValue;
          }
        }
      }
    }
    return value;
  }
  seekCheckMate(board, move, team) {
    let newBoard = this.api.resultOfHypotheticalMove({ board, moveObject: move });
    if (board._winner === team) {
      return 1e3;
    } else {
      return 0;
    }
  }
  doubleMoveInOpeningPenalty(board, move) {
    if (!board.pieceHasNotMovedFrom(move.startPosition)) {
      return -5;
    } else {
      return 0;
    }
  }
  discourageEarlyQueenMovement(board, move) {
    let pieceType = board.pieceTypeAt(move.startPosition);
    if (pieceType === board_default.QUEEN) {
      return -10;
    } else {
      return 0;
    }
  }
  limitNonCastleKingMoves(board, move) {
    let pieceType = board.pieceTypeAt(move.startPosition);
    if (pieceType === board_default.KING && !_Bot.CASTLEENDPOSITIONS.includes(move.endPosition)) {
      return -10;
    } else {
      return 0;
    }
  }
  static get CASTLEENDPOSITIONS() {
    return ["c1", "g1", "c8", "g8"];
  }
  static get KINGSTARTPOSITIONS() {
    return ["e1", "e8"];
  }
  stackDeckForCastle(board, move, weight) {
    let pieceType = board.pieceTypeAt(move.startPosition);
    if (pieceType === board_default.KING && _Bot.KINGSTARTPOSITIONS.includes(move.startPosition) && // (board.queenSideCastleViableFrom(move.startPosition) || board.kingSideCastleViableFrom(move.startPosition)) && Bot.CASTLEENDPOSITIONS.includes(move.endPosition)      ) {
    (board.queenSideCastleViableFor(board.allowedToMove) || board.kingSideCastleViableFor(board.allowedToMove)) && _Bot.CASTLEENDPOSITIONS.includes(move.endPosition)) {
      return weight;
    } else {
      return 0;
    }
  }
  weightAccessibleSquares(moves) {
    let squareValues = 0;
    for (let i = 0; i < moves.length; i++) {
      let square = moves[i].endPosition, squareValue = _Bot.SQUAREWEIGHTS[square];
      squareValues = squareValues + squareValue;
    }
    squareValues = Math.round(squareValues * 100) / 100;
    return squareValues;
  }
  static get SQUAREWEIGHTS() {
    return {
      // d5: 1.6,
      // d4: 1.6,
      // e5: 1.6,
      // e4: 1.6,
      35: 1.6,
      36: 1.6,
      27: 1.6,
      28: 1.6,
      // c3: .8,
      // c4: .8,
      // c5: .8,
      // c6: .8,
      // d3: .8,
      // d6: .8,
      // e3: .8,
      // e6: .8,
      // f3: .8,
      // f4: .8,
      // f5: .8,
      // f6: .8,
      18: 0.8,
      19: 0.8,
      20: 0.8,
      21: 0.8,
      26: 0.8,
      29: 0.8,
      34: 0.8,
      37: 0.8,
      42: 0.8,
      43: 0.8,
      44: 0.8,
      45: 0.8,
      // b2: .2,
      // b3: .2,
      // b4: .2,
      // b5: .2,
      // b6: .2,
      // b7: .2,
      // c2: .2,
      // c7: .2,
      // d2: .2,
      // d7: .2,
      // e2: .2,
      // e7: .2,
      // f2: .2,
      // f7: .2,
      // g2: .2,
      // g3: .2,
      // g4: .2,
      // g5: .2,
      // g6: .2,
      // g7: .2,
      9: 0.2,
      10: 0.2,
      11: 0.2,
      12: 0.2,
      13: 0.2,
      14: 0.2,
      17: 0.2,
      22: 0.2,
      25: 0.2,
      30: 0.2,
      33: 0.2,
      38: 0.2,
      41: 0.2,
      46: 0.2,
      49: 0.2,
      50: 0.2,
      51: 0.2,
      52: 0.2,
      53: 0.2,
      54: 0.2,
      // a1: .1,
      // a2: .1,
      // a3: .1,
      // a4: .1,
      // a5: .1,
      // a6: .1,
      // a7: .1,
      // a8: .1,
      // b1: .1,
      // b8: .1,
      // c1: .1,
      // c8: .1,
      // d1: .1,
      // d8: .1,
      // e1: .1,
      // e8: .1,
      // f1: .1,
      // f8: .1,
      // g1: .1,
      // g8: .1,
      // h1: .1,
      // h2: .1,
      // h3: .1,
      // h4: .1,
      // h5: .1,
      // h6: .1,
      // h7: .1,
      // h8: .1
      1: 0.1,
      2: 0.1,
      3: 0.1,
      4: 0.1,
      5: 0.1,
      6: 0.1,
      7: 0.1,
      8: 0.1,
      16: 0.1,
      24: 0.1,
      32: 0.1,
      40: 0.1,
      48: 0.1,
      56: 0.1,
      57: 0.1,
      58: 0.1,
      59: 0.1,
      60: 0.1,
      61: 0.1,
      62: 0.1,
      63: 0.1,
      15: 0.1,
      23: 0.1,
      31: 0.1,
      39: 0.1,
      47: 0.1,
      55: 0.1,
      63: 0.1
    };
  }
  sortArray(array) {
    let sortNumber = function(a, b) {
      return a - b;
    };
    return array.sort(sortNumber);
  }
  // copyArray(array){
  //   let newArray = []
  //   for(let i = 0; i < array.length; i++){
  //     newArray.push( array[i] )
  //   };
  //   return newArray
  // }
  pickNweightiestMovesFrom(weightedMoves, n) {
    let nWeights = [], weights = Object.keys(weightedMoves), sortedWeights = this.sortArray(weights);
    for (let i = sortedWeights.length - 1; i > -1 && nWeights.length < n; i--) {
      let weight = sortedWeights[i], moves = weightedMoves[weight];
      for (let j = 0; j < moves.length; j++) {
        nWeights.push(moves[j]);
      }
    }
    return nWeights;
  }
};
var bot_default = Bot;

// app/javascript/gameplay/view.js
var View2 = class {
  constructor(_gameController) {
    this.boundHighlightTile = this.highlightTile.bind(this);
    this.boundAttemptMove = this.attemptMove.bind(this);
    this._gameController = _gameController;
    this.unicodePieces = {
      WK: "&#9812",
      BK: "&#9818",
      WQ: "&#9813",
      BQ: "&#9819",
      WR: "&#9814",
      BR: "&#9820",
      WB: "&#9815",
      BB: "&#9821",
      WN: "&#9816",
      BN: "&#9822",
      WP: "&#9817",
      BP: "&#9823"
    };
  }
  static get TILE_HEIGHT() {
    return "49";
  }
  displayAlerts(message) {
    document.getElementById("notifications").innerHTML = message;
  }
  clearAlerts() {
    document.getElementById("notifications").innerHTML = "";
  }
  undisplayPiece(gridPosition) {
    let element = document.getElementById(gridPosition);
    element.innerHTML = "";
    element.classList.remove(board_default.WHITE);
    element.classList.remove(board_default.BLACK);
  }
  displayPiece(args) {
    let gridPosition = args["gridPosition"], pieceInitials = args["pieceInitials"], element = document.getElementById(gridPosition), pieceImage = this.unicodePieces[pieceInitials];
    element.innerHTML = pieceImage;
    element.classList.add(pieceInitials[0]);
    element.style.color = "black";
  }
  displayLayOut(args) {
    let board = args["board"], alert2 = args["alert"] || "", layOut = board.layOut;
    for (let i = 0; i < layOut.length; i++) {
      let gridPosition = board_default.gridCalculator(i), pieceInitials = this.pieceInitials(layOut[i]);
      this.undisplayPiece(gridPosition);
      let pieceObject = board.pieceObject(i);
      if (board_default.parseTeam(pieceObject) !== board_default.EMPTY) {
        this.displayPiece({ pieceInitials, gridPosition });
      }
      ;
    }
    ;
    this.setTileClickListener();
    this.blackCaptureDivNeedsExpanding(board);
    this.whiteCaptureDivNeedsExpanding(board);
    this.updateCaptures(board);
    this.clearAlerts();
    this.updateTeamAllowedToMove(board);
    this.displayAlerts(alert2);
  }
  pieceImgSrc(pieceInitials) {
  }
  pieceInitials(pieceObject) {
    let firstInitial = board_default.parseTeam(pieceObject), secondInitial = board_default.parseSpecies(pieceObject);
    return firstInitial + secondInitial;
  }
  highlightTile() {
    if (!this._gameController.board.gameOver) {
      let target = arguments[0].currentTarget, position = board_default.gridCalculatorReverse(target.id), team = board_default.EMPTY;
      this.unhighlLighTiles();
      this.setTileClickListener();
      if (target.classList.contains(board_default.BLACK) || target.classList.contains(board_default.WHITE)) {
        team = this.teamSet(target.classList);
        if (team === this._gameController.board.allowedToMove) {
          let viables = rules_default.viablePositionsFromKeysOnly({ startPosition: position, board: this._gameController.board });
          for (let i = 0; i < viables.length; i++) {
            let tilePosition = viables[i], alphaNumericPosition = board_default.gridCalculator(tilePosition), square = document.getElementById(alphaNumericPosition);
            square.classList.add("highlight2");
            square.removeEventListener("click", this.boundHighlightTile);
            square.addEventListener("click", this.boundAttemptMove);
          }
          target.classList.add("highlight1");
          target.classList.add("startPosition");
        }
      }
    }
  }
  retrieveTiles() {
    return document.getElementsByClassName("chess-tile");
  }
  // teamSet(src){
  //     let regex = /(\w)[A-Z]\.png$/,
  //     teamInitial = src.match(regex)[1];
  //   if( teamInitial === "B"){
  //     return Board.BLACK;
  //   }else if (teamInitial === "W") {
  //     return Board.WHITE;
  //   }else {
  //     throw new Error("error in teamSet")
  //   }
  // }
  teamSet(list) {
    if (list.contains(board_default.BLACK)) {
      return board_default.BLACK;
    } else if (list.contains(board_default.WHITE)) {
      return board_default.WHITE;
    } else {
      throw new Error("error in teamSet");
    }
  }
  unhighlLighTiles() {
    let tiles = this.retrieveTiles();
    for (let i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      tile.removeEventListener("click", this.boundHighlightTile);
      tile.removeEventListener("click", this.boundAttemptMove);
      tile.classList.remove("startPosition");
      tile.classList.remove("highlight1");
      tile.classList.remove("highlight2");
    }
  }
  updateTeamAllowedToMove(board) {
    let span = document.getElementById("team-allowed-to-move");
    span.innerText = board.allowedToMove;
  }
  updateCaptures(board) {
    let blackCaptureDiv = document.getElementById("B-captures"), whiteCaptureDiv = document.getElementById("W-captures"), capturedPieces = board.capturedPieces;
    blackCaptureDiv.innerHTML = "<br><br><br>";
    whiteCaptureDiv.innerHTML = "<br><br><br>";
    for (let i = 0; i < capturedPieces.length; i++) {
      let pieceObject = capturedPieces[i], team = board_default.parseTeam(pieceObject), pieceInitials = this.pieceInitials(pieceObject);
      this.displayPiece({ pieceInitials, gridPosition: team + "-captures" });
    }
  }
  attemptMove() {
    let target = arguments[0].currentTarget, endPosition = board_default.gridCalculatorReverse(target.id), startElement = document.getElementsByClassName("startPosition")[0], startPosition = board_default.gridCalculatorReverse(startElement.id);
    this.unhighlLighTiles();
    this.setTileClickListener();
    this._gameController.attemptMove(startPosition, endPosition);
  }
  setTileClickListener() {
    let tiles = this.retrieveTiles();
    for (let i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      tile.addEventListener("click", this.boundHighlightTile);
    }
  }
  blackCaptureDivNeedsExpanding(board) {
    let capturedPieces = board.capturedPieces, total = 0;
    for (let i = 0; i < capturedPieces.length; i++) {
      if (board_default.parseTeam(capturedPieces[i]) === board_default.BLACK) {
        total++;
      }
    }
    if (total === 11) {
      this.expandBlackCaptureDiv();
    }
  }
  whiteCaptureDivNeedsExpanding(board) {
    let capturedPieces = board.capturedPieces, total = 0;
    for (let i = 0; i < capturedPieces.length; i++) {
      if (board_default.parseTeam(capturedPieces[i]) === board_default.WHITE) {
        total++;
      }
    }
    if (total === 11) {
      this.expandWhiteCaptureDiv();
    }
  }
  expandWhiteCaptureDiv() {
    let div = document.getElementById("W-captures");
    div.style.height = 98;
  }
  expandBlackCaptureDiv() {
    let div = document.getElementById("B-captures");
    div.style.height = 98;
  }
  setUndoClickListener(gameController2) {
    let undoButton = document.getElementById("undo-button");
    undoButton.addEventListener("click", gameController2.undo.bind(gameController2));
  }
  setPauseClickListener(gameController2) {
    let pauseButton = document.getElementById("pause-button");
    pauseButton.addEventListener("click", gameController2.pause.bind(gameController2));
  }
};
var view_default = View2;

// app/javascript/gameplay/game_controller.js
var throwIfMissing = (p) => {
  throw new Error(`Missing parameter: ${p}`);
};
var GameController = class {
  constructor() {
    this.board = new board_default({});
    this.view = new view_default(this);
    this._paused = false;
    this.view.displayLayOut({ board: this.board, alert: "" });
    this.view.setTileClickListener();
    this.view.setUndoClickListener(this);
    this.view.setPauseClickListener(this);
    this.api = new api_default({ board: this.board, gameController: this });
    this._blackBot = new bot_default(this.api, board_default.BLACK);
    if (this._whiteBot && !this._paused) {
      this.queryNextBotMove();
    }
  }
  pause() {
    this._paused = true;
  }
  attemptMove(startPosition = throwIfMissing("startPosition"), endPosition = throwIfMissing("endPosition")) {
    var board = this.board, alert2 = "";
    if (board.gameOver) {
      return;
    }
    if (!board_default._inBounds(endPosition)) {
      alert2 = "stay on the board, fool";
    } else if (board.occupiedByTeamMate({ position: endPosition, teamString: board.allowedToMove })) {
      alert2 = "what, are you trying to capture your own piece?";
    } else {
      var moveObject = rules_default.getMoveObject(startPosition, endPosition, board);
      if (moveObject.illegal) {
        alert2 = "illegal move attempted";
      } else {
        board._officiallyMovePiece(moveObject);
        let lastNotation = board.movementNotation[board.movementNotation.length - 1];
        alert2 = moveObject.alert;
        if (/#/.exec(lastNotation)) {
          alert2 = "checkmate";
        } else if (/\+/.exec(lastNotation)) {
          alert2 = "check";
        } else if (board.gameOver === true) {
          alert2 = "stalemate";
        }
      }
    }
    this.view.displayLayOut({ board, alert: alert2, startPosition });
    if (this.movingTeamHasBot() && !this._paused) {
      let queryMove = this.queryNextBotMove.bind(this);
      setTimeout(function() {
        queryMove();
      }, 400);
    }
  }
  movingTeamHasBot() {
    let movingTeam = this.board.allowedToMove;
    return movingTeam === board_default.WHITE && this._whiteBot !== void 0 || movingTeam === board_default.BLACK && this._blackBot !== void 0;
  }
  queryBotMove(team) {
    if (team === board_default.WHITE) {
      let moveObject = this._whiteBot.determineMove({ board: this.board, api: this.api });
      this.attemptMove(moveObject.startPosition, moveObject.endPosition);
    } else {
      let moveObject = this._blackBot.determineMove({ board: this.board, api: this.api });
      this.attemptMove(moveObject.startPosition, moveObject.endPosition);
    }
  }
  queryNextBotMove() {
    let team = this.board.allowedToMove;
    this.queryBotMove(team);
  }
  undo() {
    if (JSON.parse(this.board.previousLayouts).length) {
      this.board._undo();
      this.view.displayLayOut({ board: this.board });
    }
  }
  runMoves(moveArray) {
    var func = this.runMoves.bind(this);
    if (moveArray.length > 1) {
      this.attemptMove(moveArray[0], moveArray[1]);
      moveArray.shift();
      moveArray.shift();
      setTimeout(function() {
        func(moveArray);
      }, 500);
    }
  }
};
var game_controller_default = GameController;

// app/javascript/application.js
var gameController = new game_controller_default();
/*! Bundled license information:

@hotwired/turbo/dist/turbo.es2017-esm.js:
  (*!
  Turbo 8.0.0-beta.2
  Copyright © 2023 37signals LLC
   *)
*/
//# sourceMappingURL=/assets/application.js.map

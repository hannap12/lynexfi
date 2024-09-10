// we use window.fn instead of const fn = ... to avoid conflicts when the script is loaded multiple times
window.addAwesomeQACSS = () => {
  const awesomeStyleId = "awesomeqa-style";
  if (document.getElementById(awesomeStyleId)) {
    return;
  }
  const css = `
    #awesomeqa-chat-widget {
      z-index: var(--z-index);
      position: absolute;
      top: -10000px;
      color-scheme: normal;
    }
    .awesomeqa-link {
      position: fixed;
      z-index: -100;
      border-radius: 50%;
      font-size: 4px !important;
      display: flex;
      color: #7e7e7e !important;
      justify-content: center;
      align-items: center;
      right: var(--position-right);
      bottom: var(--position-bottom);
      width: var(--size);
      height: var(--size);
      text-decoration: none;
    }
    .awesomeqa-iframe {
      background-color: transparent;
      z-index: 9999;
      border: none;
      position: fixed;
      overflow: visible;
      color-scheme: normal;
    }
    .awesomeqa-widget-closed {
      width: var(--closed-size);
      height: var(--closed-size);
      right: var(--closed-position-right);
      bottom: var(--closed-position-bottom);
    }
    .awesomeqa-widget-opened {
      width: var(--opened-width);
      height: var(--opened-height);
      right: var(--opened-position-right);
      bottom: var(--opened-position-bottom);
    }
    .awesomeqa-widget-appear {
      display: unset;
    }
    .awesomeqa-widget-disappear {
      display: none;
    }
  `;
  const style = document.createElement("style");
  style.id = awesomeStyleId;
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  document.head.appendChild(style);
};

window.getAwesomeQAScript = () => {
  // get script by id, because async loading can lead to document.currentScript being null
  let script = document.getElementById("awesomeqa-chat-widget-script");
  // try to get current script
  if (!script) script = document.currentScript;
  // try to get script by src
  if (!script) {
    const scripts = document.getElementsByTagName("script");
    for (const s of scripts) {
      if (s.src.includes("/web-support/chat-widget.js")) return s;
    }
  }
  return script;
};

window.parseConfig = (script) => {
  const configStr = script.getAttribute("config") ?? "{}";
  let config = {};
  try {
    config = JSON.parse(configStr);
  } catch (error) {
    console.error("Error parsing config JSON:", error, configStr);
  }
  return { config, configStr };
};

window.parsePxValue = (attr, defaultValue = 0) => {
  return attr ? parseInt(attr.toString().replace("px", "")) : defaultValue;
};

window.setCustomProperties = (element, properties) => {
  for (const [key, value] of Object.entries(properties)) {
    element.style.setProperty(key, value);
  }
};

window.createWidgetElements = () => {
  // Create the elements, initialize them to be hidden
  const widget = document.createElement("div");
  widget.id = "awesomeqa-chat-widget";
  widget.classList.add("awesomeqa-widget-disappear"); // note: .replace in updateIframeAttributes depends on this being initialized

  const link = document.createElement("a");
  link.id = "awesomeqa-chat-widget-link";
  link.href = "https://home.awesomeqa.xyz";
  link.className = "awesomeqa-link";
  link.innerHTML = "Powered by<br/>AwesomeQA";
  widget.appendChild(link);

  const iframe = document.createElement("iframe");
  iframe.id = "awesomeqa-chat-widget-iframe";
  iframe.className = "awesomeqa-iframe";
  iframe.classList.add("awesomeqa-widget-closed"); // note: .replace in updateIframeAttributes depends on this being initialized
  widget.appendChild(iframe);

  document.body.appendChild(widget);
  return { widget, iframe, link };
};

window.updateIframeAttributes = (
  iframe,
  link,
  baseUrl,
  communityId,
  config,
  encodedConversationTicketSourceUrl,
  ticketConversationId,
  closedSizeStr,
  openedChatbotHeight,
  openedChatbotWidth,
  closedPositionRight,
  closedPositionBottom,
  openedPositionRight,
  openedPositionBottom,
  zIndex
) => {
  const widget = iframe.parentElement;
  const configQueryStr = encodeURIComponent(JSON.stringify(config));
  iframe.contentWindow.location.replace(
    `${baseUrl}/chat-widget?communityId=${communityId}&config=${configQueryStr}&encodedConversationTicketSourceUrl=${encodedConversationTicketSourceUrl}&ticketConversationId=${ticketConversationId}`
  );
  // reset to hidden while loading
  iframe.classList.replace("awesomeqa-widget-opened", "awesomeqa-widget-closed");
  widget.classList.replace("awesomeqa-widget-appear", "awesomeqa-widget-disappear");

  setCustomProperties(iframe, {
    "--closed-size": closedSizeStr,
    "--opened-width": openedChatbotWidth,
    "--opened-height": openedChatbotHeight,
    "--closed-position-right": closedPositionRight,
    "--closed-position-bottom": closedPositionBottom,
    "--opened-position-right": openedPositionRight,
    "--opened-position-bottom": openedPositionBottom,
  });
  setCustomProperties(link, {
    "--size": closedSizeStr,
    "--position-right": closedPositionRight,
    "--position-bottom": closedPositionBottom,
  });
  setCustomProperties(widget, {
    "--z-index": zIndex,
  });

  iframe.onload = () => {
    window.addEventListener("message", (e) => {
      // ignore if e.data or e.data.message does not start with "awesomeqa-"
      const AWESOMEQA_MESSAGE_PREFIX = "awesomeqa-";
      if (
        !(
          (typeof e.data === "string" && e.data.startsWith(AWESOMEQA_MESSAGE_PREFIX)) ||
          (typeof e.data === "object" && e.data.message && e.data.message.startsWith(AWESOMEQA_MESSAGE_PREFIX))
        )
      ) {
        return;
      }

      iframe.contentWindow.postMessage(e.data, "*");
      // appear/disappear is applied to the widget container, not the iframe
      // opened/closed is applied to the iframe
      if (e.data === "awesomeqa-widget-closed") {
        iframe.classList.replace("awesomeqa-widget-opened", "awesomeqa-widget-closed");
      } else if (e.data === "awesomeqa-widget-opened") {
        iframe.classList.replace("awesomeqa-widget-closed", "awesomeqa-widget-opened");
      } else if (e.data === "awesomeqa-widget-appear") {
        widget.classList.replace("awesomeqa-widget-disappear", "awesomeqa-widget-appear");
      } else if (e.data === "awesomeqa-widget-disappear") {
        widget.classList.replace("awesomeqa-widget-appear", "awesomeqa-widget-disappear");
      } else if (e.data.message === "awesomeqa-set-style") {
        iframe.style[e.data.property] = e.data.value;
      }
    });
    window.parent.onresize = adjustIframeHeight;
    // this resizes e.g. when opening the keyboard on mobile. We don't do it right now because it otherwise limits the space left for the chat significantly
    // if (window.parent.visualViewport) {
    //   window.parent.visualViewport.addEventListener("resize", adjustIframeHeight);
    //   window.parent.visualViewport.addEventListener("scroll", adjustIframeHeight);
    // }
    function adjustIframeHeight() {
      const viewportHeight = window.parent.visualViewport
        ? window.parent.visualViewport.height
        : window.parent.innerHeight;
      iframe.style.maxHeight = `${viewportHeight}px`;
    }
    adjustIframeHeight();
  };
  // prevent automated scrolling when opening/closing the widget on Firefox
  const overflow = document.body.style.overflow;
  iframe.addEventListener("transitionstart", function () {
    document.body.style.overflow = "hidden";
  });
  iframe.addEventListener("transitionend", function () {
    document.body.style.overflow = overflow;
  });
};

window.updateAwesomeQaWidget = () => {
  addAwesomeQACSS();

  const awesomeQAScript = getAwesomeQAScript();
  if (!awesomeQAScript) {
    console.error("AwesomeQA: script tag not found");
    return;
  }

  const communityId = awesomeQAScript.getAttribute("communityId");
  if (!communityId) {
    console.error("AwesomeQA: communityId is not defined");
    return;
  }

  const isMobile = window.matchMedia("only screen and (max-width: 768px)").matches;

  const { config, configStr } = parseConfig(awesomeQAScript);
  const baseUrl = config.baseUrl ?? "https://awesomeqa.xyz";
  const widgetButtonPxSize = parsePxValue(config.widgetButtonPxSize, 56);
  config.widgetButtonPxSize = widgetButtonPxSize;
  const iconOffset = 16;
  const closedSize = widgetButtonPxSize + 2 * iconOffset;
  const closedSizeStr = `${closedSize}px`;
  let positionRight = config.positionRight ?? "16px";
  let positionBottom = config.positionBottom ?? "16px";
  const marginTop = config?.marginTop ?? "0px";
  let openedChatbotHeight = config?.openedChatbotHeight ?? `min(calc(95vh - ${positionBottom} - ${marginTop}), 900px)`;
  let openedChatbotWidth =
    config.openedChatbotWidth ?? `min(min(max(30vw, 500px), 600px), calc(100vw - 2 * ${positionRight}))`;
  const zIndex = config?.zIndex ?? config?.["z-index"] ?? "2147483646";

  let closedPositionRight = positionRight;
  let closedPositionBottom = positionBottom;
  let openedPositionRight = positionRight;
  let openedPositionBottom = positionBottom;
  if (isMobile) {
    // fullscreen
    openedChatbotHeight = "100vh";
    openedChatbotWidth = "100vw";
    openedPositionRight = "0px";
    openedPositionBottom = "0px";
    config["is-mobile"] = true;
  }

  let widget = document.getElementById("awesomeqa-chat-widget");
  let iframe = document.getElementById("awesomeqa-chat-widget-iframe");
  let link = document.getElementById("awesomeqa-chat-widget-link");

  if (!widget) {
    ({ widget, iframe, link } = createWidgetElements(positionRight, positionBottom, closedSizeStr));
  }

  const encodedConversationTicketSourceUrl = encodeURIComponent(window.location.href);

  const urlParams = new URLSearchParams(window.location.search);
  const ticketConversationId = urlParams.get("ticketConversationId") ?? "";

  const lastConfigStr = configStr + communityId + encodedConversationTicketSourceUrl + ticketConversationId;
  if (widget && lastConfigStr === configStr) {
    return; // No need to reload iframe if config and communityId are the same
  }

  updateIframeAttributes(
    iframe,
    link,
    baseUrl,
    communityId,
    config,
    encodedConversationTicketSourceUrl,
    ticketConversationId,
    closedSizeStr,
    openedChatbotHeight,
    openedChatbotWidth,
    closedPositionRight,
    closedPositionBottom,
    openedPositionRight,
    openedPositionBottom,
    zIndex
  );
};

if (document.readyState !== "loading") {
  updateAwesomeQaWidget();
} else {
  document.addEventListener("DOMContentLoaded", updateAwesomeQaWidget);
}

export function resizeIframe() {
  const iframe = document.getElementById("squiffy-iframe")

  if (iframe.contentWindow && iframe.contentWindow.document) {
    iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + "px"
  }
}

export function mountSquiffyIframe() {
  document.getElementById("squiffy-iframe").onload = function() {
    resizeIframe()

    const observer = new MutationObserver(resizeIframe)
    const iframeDoc = this.contentWindow.document

    observer.observe(
      iframeDoc.body,
      {
        childList: true, 
        subtree: true
      }
    )
  }
}
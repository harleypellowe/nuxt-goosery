function resizeIframe() {
  const iframe = document.getElementById("squiffy-iframe")
  iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + "px"
}

export function mountSquiffyIframe() {
  window.addEventListener("resize", resizeIframe)
  document.getElementById("squiffy-iframe").onload = resizeIframe
}
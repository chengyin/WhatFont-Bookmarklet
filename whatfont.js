(function (window) {
  var document = window.document;
  var fonttip = document.createElement("div");
  fonttip.style.cssText = "background: rgba(0,0,0,0.8); border: 1px solid black; color: white; display: none; font: bold 14px sans-serif; padding: 0.5em; position: absolute; text-shadow: 0 -1px 0 black; z-index: 30000; -webkit-box-shadow: inset 0 1px 0 #aaa; -webkit-border-radius: 5px;"
  fonttip.innerHTML = "(FONT)";

  var elems = document.getElementsByTagName("*");
  for (var i in elems) {
    if (elems[i].nodeType == 1) {
      elems[i].addEventListener("mousemove", function (event) {
        var font = window.getComputedStyle(this, null).getPropertyValue('font-family');
        fonttip.style.display = "inline-block";
        fonttip.style.fontFamily = font;
        fonttip.style.top = event.pageY + 10 + "px";
        fonttip.style.left = event.pageX + 10 + "px";
        fonttip.innerHTML = font;
        event.stopPropagation();
      }, false);
    }
  }
  
  document.body.appendChild(fonttip);
}) (window);
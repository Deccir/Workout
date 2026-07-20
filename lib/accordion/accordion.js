function toggleAccordion(id) {
  var element = document.getElementById(id);
  var content = element.querySelector('.content');
  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    content.classList.remove('open');
  } else {
    var padding = getStyleVariable('--accordion-padding');
    content.style.maxHeight = (content.scrollHeight + parseInt(padding, 10)*2) + "px";
    content.classList.add('open');
  }
}

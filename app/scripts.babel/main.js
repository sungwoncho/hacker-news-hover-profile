import template from 'lodash.template';

// helper function to make ajax request
function callAjax(url, done) {
    let req;
    req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      if (req.readyState == 4 && req.status == 200){
        done(req.responseText);
      }
    }
    req.open("GET", url, true);
    req.send();
}

// getUserEndpoint gets Hacker News API endpoint for the user
function getUserEndpoint(username) {
  return `https://hacker-news.firebaseio.com/v0/user/${username}.json`;
}

const app = {
  init() {
    const cardContainerURL = chrome.extension.getURL('card-container.html');
    const cardURL = chrome.extension.getURL('card.html');

    callAjax(cardURL, (res) => {
      this.getCardHtml = template(res); // Save reference
    });
    callAjax(cardContainerURL, (res) => {
      this.getCardContainerHtml = template(res); // Save reference
    });
  },

  showCard(event) {
    const username = event.target.innerHTML;
    const endpoint = getUserEndpoint(username);

    const xPos = event.pageX;
    const yPos = event.pageY;
    const loaderURL = chrome.extension.getURL('loader.svg');

    // Mount container with loader on DOM
    let str = this.getCardContainerHtml({
      left: xPos,
      top: yPos,
      loaderURL: loaderURL
    });
    let child = document.createElement('div');
    child.innerHTML = str;
    let el = child.firstChild;
    document.body.appendChild(el);

    // Get user info and replace the loader with the actual content
    callAjax(endpoint, (res) => {
      let data = JSON.parse(res);
      let str = this.getCardHtml({
        username,
        about: data.about,
        created: data.created,
        karma: data.karma
      });

      let child = document.createElement('div');
      child.innerHTML = str;
      let el = child.firstChild;

      let loader = document.getElementsByClassName('hpc-loader')[0];
      loader.parentNode.removeChild(loader);
      document.getElementsByClassName('hpc-container')[0].appendChild(el);
    });
  },

  hideCard() {
    let cards = document.getElementsByClassName('hpc-container');
    for (let i = 0; i < cards.length; i++) {
      let node = cards[i];
      node.parentNode.removeChild(node);
    }
  }
}

app.init();

// Append eventListeners to username anchors
let userLinks = document.getElementsByClassName('hnuser')
for (let i = 0; i < userLinks.length; i++) {
  userLinks[i].addEventListener('mouseover', app.showCard.bind(app), false);
  userLinks[i].addEventListener('mouseout', app.hideCard.bind(app), false);
}

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

// fromEpochToDaysAgo returns 'x days ago' based on epoch
function fromEpochToDaysAgo(epoch) {
  let secs = ((new Date()).getTime() / 1000) - epoch;
  let minutes = secs / 60;
  let hours = minutes / 60;
  let days = Math.floor(hours / 24);

  return days + (days > 1 ? ' days ago' : ' day ago');
}

const app = {
  state: {
    isShowingCard: false
  },

  init() {
    const cardContainerURL = chrome.extension.getURL('card-container.html');
    const cardURL = chrome.extension.getURL('card.html');
    const loaderURL = chrome.extension.getURL('loader.svg');

    // Append eventListeners to username anchors
    let userLinks = document.getElementsByClassName('hnuser')
    for (let i = 0; i < userLinks.length; i++) {
      userLinks[i].addEventListener('mouseenter', app.showCard.bind(this), false);
    }

    // Save reference for getCardHtml
    callAjax(cardURL, (cardTmplStr) => {
      this.getCardHtml = template(cardTmplStr);
    });

    // Mount container with loader on DOM
    callAjax(cardContainerURL, (cardContainerTmplStr) => {
      const compiledTmpl = template(cardContainerTmplStr);
      let str = compiledTmpl({
        left: 0,
        top: 0,
        loaderURL
      });
      let child = document.createElement('div');
      child.innerHTML = str;
      let el = child.firstChild;
      document.body.appendChild(el);

      el.addEventListener('mouseleave', this.hideCard.bind(this), false);
    });
  },

  showCard(event) {
    const { isShowingCard } = this.state;
    if (isShowingCard) {
      return;
    }

    this.state.isShowingCard = true;

    const username = event.target.innerHTML;
    const endpoint = getUserEndpoint(username);

    const rectObj = event.target.getBoundingClientRect();
    const xPos = rectObj.right - rectObj.width / 2 - 108;
    const yPos = rectObj.top + window.scrollY - 5;

    document.getElementById('hpc-card-overlay').style.left = xPos;
    document.getElementById('hpc-card-overlay').style.top = yPos;

    // add CSS classes
    document.getElementById('hpc-card-overlay').className += ' visible';
    document.getElementById('hpc-card-container').className += ' is-loading';

    // Get user info
    callAjax(endpoint, (res) => {
      let data = JSON.parse(res);
      let str = this.getCardHtml({
        username,
        about: data.about,
        created: fromEpochToDaysAgo(data.created),
        karma: data.karma
      });

      let child = document.createElement('div');
      child.innerHTML = str;
      let el = child.firstChild;

      // Remove `is-loading` CSS class
      document.getElementById('hpc-card-container').className = '';
      // Mount the card content
      document.getElementById('hpc-card').appendChild(el);
    });
  },

  hideCard(event) {
    const card = document.getElementById('hpc-card-content');
    card.parentNode.removeChild(card);

    // Remove `visible` CSS class
    document.getElementById('hpc-card-overlay').className = '';

    this.state.isShowingCard = false;
  }
}

// init app
app.init();

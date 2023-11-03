import { loadCSS, loadScript } from '../../scripts/aem.js';
import { section } from '../../scripts/dom-helpers.js';
import { getLocale } from '../../scripts/scripts.js';

// map containing environment configurations
const naavDataDomains = {
  dev: 'https://www.webdev.servicenow.com',
  qa: 'https://www.webqa.servicenow.com',
  stage: 'https://www.webstg.servicenow.com',
  prod: 'https://www.servicenow.com',
};

export function getDataDomain() {
  const env = new URLSearchParams(window.location.search).get('naas');

  return env ? naavDataDomains[env.toLowerCase()] || naavDataDomains.prod : naavDataDomains.stage;
}

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  block.innerHTML = '';

  document.documentElement.setAttribute('data-path-hreflang', getLocale().toLowerCase());
  const dataDomain = getDataDomain();

  try {
    block.append(section({ id: 'naas-header-old', class: 'naas-header-old-section', 'data-domain': dataDomain }));

    // trigger NaaS JS
    await Promise.all([
      loadCSS(`${dataDomain}/nas/csi/header/v1/headerOldCSR.bundle.css`),
      loadScript(`${dataDomain}/nas/csi/header/v1/headerOldCSR.bundle.js`),
    ]);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

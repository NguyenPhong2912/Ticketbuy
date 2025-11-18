'use strict';

(function attachGreenBusAssets(global) {
    if (global.GreenBusAssets) {
        return;
    }

    const resolveAssetBaseUrl = () => {
        try {
            const { origin, pathname } = window.location;
            const [root] = pathname.split('/frontend/');
            return `${origin}${root}/frontend/src/assets`;
        } catch (error) {
            console.warn('Không thể xác định asset base URL, fallback /frontend/src/assets.', error);
            return `${window.location.origin}/frontend/src/assets`;
        }
    };

    const ASSET_BASE_URL = resolveAssetBaseUrl();

    const resolve = (relativePath = '') => {
        if (!relativePath) {
            return ASSET_BASE_URL;
        }

        const normalized = relativePath.replace(/^\/+/, '');
        return `${ASSET_BASE_URL}/${normalized}`;
    };

    const hydrateNodeSources = () => {
        const imageNodes = document.querySelectorAll('[data-asset-src]');
        imageNodes.forEach((node) => {
            const relative = node.getAttribute('data-asset-src');
            if (!relative) {
                return;
            }
            const resolved = resolve(relative);
            if (node.getAttribute('src') !== resolved) {
                node.setAttribute('src', resolved);
            }
        });

        const backgroundNodes = document.querySelectorAll('[data-asset-bg]');
        backgroundNodes.forEach((node) => {
            const relative = node.getAttribute('data-asset-bg');
            if (!relative) {
                return;
            }
            const resolved = resolve(relative);
            node.style.backgroundImage = `url('${resolved}')`;
        });
    };

    const hydrate = () => {
        try {
            hydrateNodeSources();
        } catch (error) {
            console.warn('Không thể hydrate asset placeholders.', error);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hydrate);
    } else {
        hydrate();
    }

    global.GreenBusAssets = {
        baseUrl: ASSET_BASE_URL,
        resolve,
        hydrate,
    };
})(window);



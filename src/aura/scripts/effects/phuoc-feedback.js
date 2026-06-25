import { THEME_COLORS } from "../constants.js";
import { incrementPhuoc, state } from "../state.js";

let phuocDisplay = null;
let phuocBadge = null;
let overlayCanvas = null;

function initDomRefs() {
	if (!phuocDisplay) phuocDisplay = document.getElementById('phuoc-count-display');
	if (!phuocBadge) phuocBadge = document.getElementById('phuoc-badge');
	if (!overlayCanvas) overlayCanvas = document.getElementById('canvas-overlay');
}

function toViewportPoint(startX, startY) {
	if (!overlayCanvas || !overlayCanvas.width || !overlayCanvas.height) {
		return { x: startX, y: startY };
	}

	const rect = overlayCanvas.getBoundingClientRect();
	return {
		x: rect.left + (startX / overlayCanvas.width) * rect.width,
		y: rect.top + (startY / overlayCanvas.height) * rect.height
	};
}

function burstBadge(theme) {
	const newCount = incrementPhuoc();
	if (phuocDisplay) phuocDisplay.innerText = newCount;
	if (!phuocBadge) return newCount;

	for (let index = 0; index < 3; index++) {
		const spark = document.createElement('span');
		spark.className = 'phuoc-spark';
		spark.style.setProperty('--spark-color', index % 2 === 0 ? theme.primary : theme.secondary);
		spark.style.setProperty('--spark-delay', `${index * 110}ms`);
		spark.style.setProperty('--spark-x', `${10 + index * 12}px`);
		phuocBadge.appendChild(spark);
		setTimeout(() => spark.remove(), 1280);
	}

	phuocBadge.classList.remove('rewarding');
	phuocBadge.classList.remove('popping');
	void phuocBadge.offsetWidth;
	phuocBadge.classList.add('rewarding');
	phuocBadge.classList.add('popping');
	setTimeout(() => phuocBadge.classList.remove('rewarding'), 1280);
	setTimeout(() => phuocBadge.classList.remove('popping'), 1120);

	return newCount;
}

export function syncPhuocDisplay() {
	initDomRefs();
	if (phuocDisplay) phuocDisplay.innerText = state.phuocCount;
}

export function rewardPhuoc(startX, startY) {
	initDomRefs();
	const theme = THEME_COLORS[state.activePreset];
	if (!phuocBadge) {
		const newCount = incrementPhuoc();
		if (phuocDisplay) phuocDisplay.innerText = newCount;
		return newCount;
	}

	const badgeRect = phuocBadge.getBoundingClientRect();
	const startPoint = toViewportPoint(startX ?? 0, startY ?? 0);
	const targetX = badgeRect.left + badgeRect.width - 34;
	const targetY = badgeRect.top + 8;

	const plusOne = document.createElement('span');
	plusOne.className = 'phuoc-plus-one';
	plusOne.innerText = '+1';
	plusOne.style.setProperty('--phuoc-accent', theme.primary);
	plusOne.style.setProperty('--phuoc-shadow', `rgba(${theme.primary.replace('#', '').match(/.{2}/g).map((value) => parseInt(value, 16)).join(', ')}, 0.38)`);
	plusOne.style.setProperty('--phuoc-start-x', `${startPoint.x}px`);
	plusOne.style.setProperty('--phuoc-start-y', `${startPoint.y}px`);
	plusOne.style.setProperty('--phuoc-dx', `${targetX - startPoint.x}px`);
	plusOne.style.setProperty('--phuoc-dy', `${targetY - startPoint.y}px`);
	document.body.appendChild(plusOne);

	let settled = false;
	const settleReward = () => {
		if (settled) return;
		settled = true;
		plusOne.remove();
		burstBadge(theme);
	};

	plusOne.addEventListener('animationend', settleReward, { once: true });
	setTimeout(settleReward, 1500);

	return state.phuocCount + 1;
}

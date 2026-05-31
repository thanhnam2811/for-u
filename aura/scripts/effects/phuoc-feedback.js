import { THEME_COLORS } from "../constants.js";
import { incrementPhuoc, state } from "../state.js";

let phuocDisplay = null;
let phuocBadge = null;

function initDomRefs() {
	if (!phuocDisplay) phuocDisplay = document.getElementById('phuoc-count-display');
	if (!phuocBadge) phuocBadge = document.getElementById('phuoc-badge');
}

export function syncPhuocDisplay() {
	initDomRefs();
	if (phuocDisplay) phuocDisplay.innerText = state.phuocCount;
}

export function rewardPhuoc() {
	initDomRefs();
	const newCount = incrementPhuoc();
	const theme = THEME_COLORS[state.activePreset];
	if (phuocDisplay) phuocDisplay.innerText = newCount;
	if (!phuocBadge) return newCount;

	const plusOne = document.createElement('span');
	plusOne.className = 'phuoc-plus-one';
	plusOne.innerText = '+1';
	plusOne.style.setProperty('--phuoc-accent', theme.primary);
	plusOne.style.setProperty('--phuoc-shadow', `rgba(${theme.primary.replace('#', '').match(/.{2}/g).map((value) => parseInt(value, 16)).join(', ')}, 0.38)`);
	phuocBadge.appendChild(plusOne);

	for (let index = 0; index < 3; index++) {
		const spark = document.createElement('span');
		spark.className = 'phuoc-spark';
		spark.style.setProperty('--spark-color', index % 2 === 0 ? theme.primary : theme.secondary);
		spark.style.setProperty('--spark-delay', `${index * 70}ms`);
		spark.style.setProperty('--spark-x', `${10 + index * 12}px`);
		phuocBadge.appendChild(spark);
		setTimeout(() => spark.remove(), 820);
	}

	setTimeout(() => plusOne.remove(), 900);

	phuocBadge.classList.remove('rewarding');
	phuocBadge.classList.remove('popping');
	void phuocBadge.offsetWidth;
	phuocBadge.classList.add('rewarding');
	phuocBadge.classList.add('popping');
	setTimeout(() => phuocBadge.classList.remove('rewarding'), 700);
	setTimeout(() => phuocBadge.classList.remove('popping'), 500);

	return newCount;
}

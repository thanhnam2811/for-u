/**
 * dark-veil.js — Dark Veil "Sương Khói" mechanic
 *
 * Mỗi `darkIntervalMs` giây, màn hình bắt đầu phủ dần một lớp sương khói tối.
 * User chắp tay → hào quang bùng ra xóa vùng sương xung quanh người.
 * Màn hình không bao giờ tối quá MAX_DARK_OPACITY (sương khói huyền bí).
 * Khi đạt mức tối đa, sương sẽ giữ nguyên cho tới khi user xua nó đi.
 */

import { state, MAX_DARK_OPACITY, DARK_HOLD_MS, LANTERN_TYPES } from "./state.js";

// ─────────────────────────────────────────────────────────────────────────────
// Offscreen canvas để tạo hiệu ứng "destination-out" (đục lỗ trong sương)
// ─────────────────────────────────────────────────────────────────────────────
let darkCanvas = null;
let darkCtx = null;
let veilWarning = null;
let veilProgress = null;
let veilLabel = null;

export function initDarkVeil() {
	darkCanvas = document.createElement('canvas');
	darkCtx = darkCanvas.getContext('2d');
	veilWarning = document.getElementById('veil-warning');
	veilProgress = document.getElementById('veil-progress-bar');
	veilLabel = document.getElementById('veil-warning-label');

	// Bắt đầu chu kỳ đầu tiên ngay lập tức
	state.darkStartTime = performance.now();
	state.darkPhase = 'growing';
}

// ─────────────────────────────────────────────────────────────────────────────
// updateDarkVeil — gọi mỗi frame trong renderLoop
// ─────────────────────────────────────────────────────────────────────────────
export function updateDarkVeil(now) {
	// Đồng bộ kích thước offscreen canvas
	// (lazily, chỉ khi thay đổi để tránh clear liên tục)

	switch (state.darkPhase) {
		case 'idle':
			// Đợi đến lúc bắt đầu chu kỳ mới
			if (now - state.darkStartTime >= state.darkIntervalMs) {
				state.darkPhase = 'growing';
				state.darkStartTime = now;
				_showVeilWarning();
			}
			break;

		case 'growing': {
			// Tăng dần opacity từ 0 → MAX_DARK_OPACITY trong darkGrowMs
			const elapsed = now - state.darkStartTime;
			const ratio = Math.min(elapsed / state.darkGrowMs, 1);
			state.darkOpacity = MAX_DARK_OPACITY * _easeInQuad(ratio);

			// Cập nhật warning UI
			_updateWarningUI(ratio);

			if (ratio >= 1) {
				state.darkPhase = 'holding';
				state.darkHoldStartTime = now;
				_showVeilWarning(true);   // Cảnh báo đỏ khi đạt max
			}
			break;
		}

		case 'holding':
			// Giữ mức tối đa và chờ user tự clear.
			_setVeilStatus('Sương mù đang dày');
			if (now - state.darkHoldStartTime >= DARK_HOLD_MS) {
				state.darkOpacity = MAX_DARK_OPACITY;
				_showVeilWarning(true);
			}
			break;

		case 'clearing': {
			// User chắp tay → ưu tiên đồng bộ bán kính clear với wave của aura nếu đang có.
			if (state.auraWaveActive) {
				state.darkClearCenterX = state.auraWaveCenterX;
				state.darkClearCenterY = state.auraWaveCenterY;
				state.darkClearRadius = Math.max(state.darkClearRadius, state.auraWaveRadius);
			} else {
				state.darkClearRadius += 35;
			}
			const maxClearRadius = Math.hypot(
				Math.max(state.darkClearCenterX, darkCanvas?.width - state.darkClearCenterX || 9999),
				Math.max(state.darkClearCenterY, darkCanvas?.height - state.darkClearCenterY || 9999)
			);

			if (state.darkClearRadius >= maxClearRadius * 0.85) {
				// Đã xóa đủ → reset hoàn toàn, bắt đầu chu kỳ mới
				state.darkOpacity = 0;
				state.darkClearRadius = 0;
				state.darkClearActive = false;
				state.darkPhase = 'idle';
				state.darkStartTime = now;
				_hideVeilWarning();
			}
			break;
		}
	}

	// Giảm dần clearRadius nếu không còn clearing
	if (state.darkPhase !== 'clearing' && state.darkClearRadius > 0) {
		state.darkClearRadius = Math.max(0, state.darkClearRadius - 5);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// triggerVeilClear — gọi khi user chắp tay thành công
// ─────────────────────────────────────────────────────────────────────────────
export function triggerVeilClear(centerX, centerY) {
	if (state.darkOpacity < 0.01) return; // Không cần clear nếu chưa có sương

	state.darkClearCenterX = centerX;
	state.darkClearCenterY = centerY;
	state.darkClearRadius = 0;
	state.darkClearActive = true;
	state.darkPhase = 'clearing';
	_hideVeilWarning();
}

// ─────────────────────────────────────────────────────────────────────────────
// drawDarkVeil — vẽ lên main canvas
// ─────────────────────────────────────────────────────────────────────────────
export function drawDarkVeil(ctx, canvasWidth, canvasHeight) {
	if (state.darkOpacity < 0.005) return;

	// Đồng bộ kích thước offscreen canvas
	if (darkCanvas && (darkCanvas.width !== canvasWidth || darkCanvas.height !== canvasHeight)) {
		darkCanvas.width = canvasWidth;
		darkCanvas.height = canvasHeight;
	}
	if (!darkCanvas || !darkCtx) return;

	// Vẽ lớp sương tối lên offscreen canvas
	darkCtx.clearRect(0, 0, canvasWidth, canvasHeight);

	const time = performance.now() * 0.00018;
	const driftX = Math.sin(time * 1.4) * canvasWidth * 0.06;
	const driftY = Math.cos(time * 1.15) * canvasHeight * 0.05;
	const mistDriftX = Math.cos(time * 2.2) * canvasWidth * 0.08;
	const mistDriftY = Math.sin(time * 1.9) * canvasHeight * 0.06;

	const baseFog = darkCtx.createRadialGradient(
		canvasWidth * 0.5 + driftX,
		canvasHeight * 0.48 + driftY,
		canvasHeight * 0.08,
		canvasWidth * 0.5 + driftX,
		canvasHeight * 0.48 + driftY,
		Math.hypot(canvasWidth, canvasHeight) * 0.64
	);
	baseFog.addColorStop(0, `rgba(14, 18, 30, ${state.darkOpacity * 0.16})`);
	baseFog.addColorStop(0.38, `rgba(8, 12, 24, ${state.darkOpacity * 0.46})`);
	baseFog.addColorStop(1, `rgba(4, 6, 18, ${state.darkOpacity * 0.92})`);

	const mistLayer = darkCtx.createRadialGradient(
		canvasWidth * 0.62 + mistDriftX,
		canvasHeight * 0.62 - mistDriftY,
		canvasHeight * 0.04,
		canvasWidth * 0.62 + mistDriftX,
		canvasHeight * 0.62 - mistDriftY,
		Math.hypot(canvasWidth, canvasHeight) * 0.34
	);
	mistLayer.addColorStop(0, `rgba(216, 226, 255, ${state.darkOpacity * 0.16})`);
	mistLayer.addColorStop(0.28, `rgba(198, 212, 242, ${state.darkOpacity * 0.16})`);
	mistLayer.addColorStop(0.62, `rgba(112, 128, 170, ${state.darkOpacity * 0.14})`);
	mistLayer.addColorStop(1, 'rgba(28, 32, 48, 0)');

	const mistLayerSoft = darkCtx.createRadialGradient(
		canvasWidth * 0.28 - mistDriftX * 0.7,
		canvasHeight * 0.76 + mistDriftY * 0.45,
		0,
		canvasWidth * 0.28 - mistDriftX * 0.7,
		canvasHeight * 0.76 + mistDriftY * 0.45,
		Math.hypot(canvasWidth, canvasHeight) * 0.28
	);
	mistLayerSoft.addColorStop(0, `rgba(244, 248, 255, ${state.darkOpacity * 0.14})`);
	mistLayerSoft.addColorStop(0.34, `rgba(224, 232, 250, ${state.darkOpacity * 0.12})`);
	mistLayerSoft.addColorStop(0.6, `rgba(170, 184, 214, ${state.darkOpacity * 0.12})`);
	mistLayerSoft.addColorStop(1, 'rgba(30, 34, 50, 0)');

	const cloudBankLeft = darkCtx.createRadialGradient(
		canvasWidth * 0.12 + driftX * 0.3,
		canvasHeight * 0.62 + driftY * 0.45,
		0,
		canvasWidth * 0.12 + driftX * 0.3,
		canvasHeight * 0.62 + driftY * 0.45,
		Math.hypot(canvasWidth, canvasHeight) * 0.22
	);
	cloudBankLeft.addColorStop(0, `rgba(245, 248, 255, ${state.darkOpacity * 0.22})`);
	cloudBankLeft.addColorStop(0.24, `rgba(214, 224, 246, ${state.darkOpacity * 0.18})`);
	cloudBankLeft.addColorStop(0.68, `rgba(92, 108, 148, ${state.darkOpacity * 0.14})`);
	cloudBankLeft.addColorStop(1, 'rgba(20, 24, 36, 0)');

	const cloudBankRight = darkCtx.createRadialGradient(
		canvasWidth * 0.82 - driftX * 0.42,
		canvasHeight * 0.34 - driftY * 0.3,
		0,
		canvasWidth * 0.82 - driftX * 0.42,
		canvasHeight * 0.34 - driftY * 0.3,
		Math.hypot(canvasWidth, canvasHeight) * 0.2
	);
	cloudBankRight.addColorStop(0, `rgba(236, 242, 255, ${state.darkOpacity * 0.18})`);
	cloudBankRight.addColorStop(0.32, `rgba(196, 208, 234, ${state.darkOpacity * 0.14})`);
	cloudBankRight.addColorStop(0.72, `rgba(84, 96, 132, ${state.darkOpacity * 0.12})`);
	cloudBankRight.addColorStop(1, 'rgba(16, 20, 34, 0)');

	const sideFog = darkCtx.createRadialGradient(
		canvasWidth * 0.18 - driftX * 0.6,
		canvasHeight * 0.28 + driftY * 0.4,
		0,
		canvasWidth * 0.18 - driftX * 0.6,
		canvasHeight * 0.28 + driftY * 0.4,
		Math.hypot(canvasWidth, canvasHeight) * 0.45
	);
	sideFog.addColorStop(0, `rgba(18, 18, 30, ${state.darkOpacity * 0.08})`);
	sideFog.addColorStop(0.5, `rgba(8, 8, 24, ${state.darkOpacity * 0.30})`);
	sideFog.addColorStop(1, 'rgba(4, 4, 18, 0)');

	const hazeBand = darkCtx.createLinearGradient(0, 0, 0, canvasHeight);
	hazeBand.addColorStop(0, `rgba(18, 18, 30, ${state.darkOpacity * 0.12})`);
	hazeBand.addColorStop(0.35, `rgba(8, 8, 22, ${state.darkOpacity * 0.02})`);
	hazeBand.addColorStop(0.65, `rgba(8, 8, 24, ${state.darkOpacity * 0.10})`);
	hazeBand.addColorStop(1, `rgba(20, 20, 34, ${state.darkOpacity * 0.22})`);

	const lowMistBand = darkCtx.createLinearGradient(0, canvasHeight * 0.42, 0, canvasHeight);
	lowMistBand.addColorStop(0, `rgba(120, 136, 178, ${state.darkOpacity * 0.02})`);
	lowMistBand.addColorStop(0.45, `rgba(206, 220, 246, ${state.darkOpacity * 0.12})`);
	lowMistBand.addColorStop(1, `rgba(92, 104, 142, ${state.darkOpacity * 0.2})`);

	const stormCeiling = darkCtx.createRadialGradient(
		canvasWidth * 0.5,
		canvasHeight * 0.02,
		0,
		canvasWidth * 0.5,
		canvasHeight * 0.02,
		Math.hypot(canvasWidth, canvasHeight) * 0.52
	);
	stormCeiling.addColorStop(0, `rgba(6, 8, 16, ${state.darkOpacity * 0.30})`);
	stormCeiling.addColorStop(0.45, `rgba(8, 10, 20, ${state.darkOpacity * 0.22})`);
	stormCeiling.addColorStop(1, 'rgba(4, 6, 14, 0)');

	const curlShadowA = darkCtx.createRadialGradient(
		canvasWidth * 0.42 + Math.sin(time * 2.4) * canvasWidth * 0.05,
		canvasHeight * 0.44 + Math.cos(time * 1.9) * canvasHeight * 0.04,
		0,
		canvasWidth * 0.42 + Math.sin(time * 2.4) * canvasWidth * 0.05,
		canvasHeight * 0.44 + Math.cos(time * 1.9) * canvasHeight * 0.04,
		Math.hypot(canvasWidth, canvasHeight) * 0.22
	);
	curlShadowA.addColorStop(0, `rgba(232, 238, 252, ${state.darkOpacity * 0.16})`);
	curlShadowA.addColorStop(0.34, `rgba(148, 160, 194, ${state.darkOpacity * 0.12})`);
	curlShadowA.addColorStop(0.68, `rgba(38, 44, 68, ${state.darkOpacity * 0.18})`);
	curlShadowA.addColorStop(1, 'rgba(10, 12, 24, 0)');

	const curlShadowB = darkCtx.createRadialGradient(
		canvasWidth * 0.74 + Math.cos(time * 2.1) * canvasWidth * 0.04,
		canvasHeight * 0.58 + Math.sin(time * 2.5) * canvasHeight * 0.05,
		0,
		canvasWidth * 0.74 + Math.cos(time * 2.1) * canvasWidth * 0.04,
		canvasHeight * 0.58 + Math.sin(time * 2.5) * canvasHeight * 0.05,
		Math.hypot(canvasWidth, canvasHeight) * 0.2
	);
	curlShadowB.addColorStop(0, `rgba(236, 242, 255, ${state.darkOpacity * 0.14})`);
	curlShadowB.addColorStop(0.28, `rgba(160, 174, 208, ${state.darkOpacity * 0.12})`);
	curlShadowB.addColorStop(0.62, `rgba(42, 48, 74, ${state.darkOpacity * 0.18})`);
	curlShadowB.addColorStop(1, 'rgba(8, 12, 22, 0)');

	const murkRibbon = darkCtx.createLinearGradient(canvasWidth * 0.08, canvasHeight * 0.48, canvasWidth * 0.88, canvasHeight * 0.9);
	murkRibbon.addColorStop(0, 'rgba(4, 6, 14, 0)');
	murkRibbon.addColorStop(0.2, `rgba(12, 16, 30, ${state.darkOpacity * 0.08})`);
	murkRibbon.addColorStop(0.52, `rgba(20, 24, 38, ${state.darkOpacity * 0.18})`);
	murkRibbon.addColorStop(0.8, `rgba(8, 10, 20, ${state.darkOpacity * 0.12})`);
	murkRibbon.addColorStop(1, 'rgba(4, 6, 14, 0)');

	const swirlBand = darkCtx.createLinearGradient(canvasWidth * 0.1, canvasHeight * 0.3, canvasWidth * 0.9, canvasHeight * 0.8);
	swirlBand.addColorStop(0, `rgba(228, 236, 255, ${state.darkOpacity * 0.03})`);
	swirlBand.addColorStop(0.35, `rgba(176, 194, 234, ${state.darkOpacity * 0.08})`);
	swirlBand.addColorStop(0.7, `rgba(98, 112, 156, ${state.darkOpacity * 0.06})`);
	swirlBand.addColorStop(1, 'rgba(20, 24, 36, 0)');

	const rollingCloudA = darkCtx.createRadialGradient(
		canvasWidth * 0.34 + driftX * 0.5,
		canvasHeight * 0.54 + driftY * 0.4,
		0,
		canvasWidth * 0.34 + driftX * 0.5,
		canvasHeight * 0.54 + driftY * 0.4,
		Math.hypot(canvasWidth, canvasHeight) * 0.26
	);
	rollingCloudA.addColorStop(0, `rgba(242, 246, 255, ${state.darkOpacity * 0.16})`);
	rollingCloudA.addColorStop(0.24, `rgba(180, 194, 226, ${state.darkOpacity * 0.14})`);
	rollingCloudA.addColorStop(0.56, `rgba(66, 76, 106, ${state.darkOpacity * 0.18})`);
	rollingCloudA.addColorStop(1, 'rgba(12, 16, 28, 0)');

	const rollingCloudB = darkCtx.createRadialGradient(
		canvasWidth * 0.68 - driftX * 0.35,
		canvasHeight * 0.72 - driftY * 0.3,
		0,
		canvasWidth * 0.68 - driftX * 0.35,
		canvasHeight * 0.72 - driftY * 0.3,
		Math.hypot(canvasWidth, canvasHeight) * 0.24
	);
	rollingCloudB.addColorStop(0, `rgba(230, 236, 248, ${state.darkOpacity * 0.14})`);
	rollingCloudB.addColorStop(0.3, `rgba(156, 170, 202, ${state.darkOpacity * 0.12})`);
	rollingCloudB.addColorStop(0.64, `rgba(54, 64, 92, ${state.darkOpacity * 0.18})`);
	rollingCloudB.addColorStop(1, 'rgba(8, 12, 22, 0)');

	const shadowSpine = darkCtx.createLinearGradient(canvasWidth * 0.16, canvasHeight * 0.22, canvasWidth * 0.84, canvasHeight * 0.9);
	shadowSpine.addColorStop(0, 'rgba(6, 8, 16, 0)');
	shadowSpine.addColorStop(0.28, `rgba(10, 12, 22, ${state.darkOpacity * 0.12})`);
	shadowSpine.addColorStop(0.58, `rgba(4, 6, 14, ${state.darkOpacity * 0.22})`);
	shadowSpine.addColorStop(1, 'rgba(4, 6, 14, 0)');

	darkCtx.fillStyle = baseFog;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = stormCeiling;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = mistLayer;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = mistLayerSoft;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = cloudBankLeft;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = cloudBankRight;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = sideFog;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = hazeBand;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = lowMistBand;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = rollingCloudA;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = rollingCloudB;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = curlShadowA;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = curlShadowB;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.save();
	darkCtx.globalCompositeOperation = 'multiply';
	darkCtx.fillStyle = shadowSpine;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.fillStyle = murkRibbon;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.restore();
	darkCtx.save();
	darkCtx.globalCompositeOperation = 'screen';
	darkCtx.fillStyle = swirlBand;
	darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	darkCtx.restore();

	// "Đục lỗ" tại vùng hào quang đã xóa (nếu đang clearing)
	if (state.darkClearRadius > 5) {
		darkCtx.save();
		darkCtx.globalCompositeOperation = 'destination-out';

		const clearGrad = darkCtx.createRadialGradient(
			state.darkClearCenterX, state.darkClearCenterY, 0,
			state.darkClearCenterX, state.darkClearCenterY, state.darkClearRadius
		);
		clearGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');       // Trung tâm: xóa hoàn toàn
		clearGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.9)');     // Vẫn xóa mạnh
		clearGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.4)');     // Rìa xóa mờ dần
		clearGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');        // Rìa ngoài: không xóa

		darkCtx.fillStyle = clearGrad;
		darkCtx.beginPath();
		darkCtx.arc(state.darkClearCenterX, state.darkClearCenterY, state.darkClearRadius, 0, Math.PI * 2);
		darkCtx.fill();
		darkCtx.restore();
	}

	// "Đục lỗ" cho ánh sáng của Hoa Đăng
	if (state.lanterns && state.lanterns.length > 0) {
		darkCtx.save();
		darkCtx.globalCompositeOperation = 'destination-out';
		state.lanterns.forEach(lantern => {
			if (lantern.phase === 'DONE' || lantern.alpha <= 0.05) return;

			// Bán kính sáng đục sương phụ thuộc vào độ sáng thực tại và loại hoa đăng
			const typeConfig = LANTERN_TYPES[lantern.type] || LANTERN_TYPES['basic'];
			const radius = 120 * lantern.scale * lantern.alpha * typeConfig.fogClearRadius;
			if (radius < 5) return;

			const clearGrad = darkCtx.createRadialGradient(
				lantern.x, lantern.y, 0,
				lantern.x, lantern.y, radius
			);
			clearGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
			clearGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.7)');
			clearGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.2)');
			clearGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

			darkCtx.fillStyle = clearGrad;
			darkCtx.beginPath();
			darkCtx.arc(lantern.x, lantern.y, radius, 0, Math.PI * 2);
			darkCtx.fill();
		});
		darkCtx.restore();
	}

	// Vẽ offscreen canvas lên main canvas
	ctx.save();
	ctx.globalCompositeOperation = 'source-over';
	ctx.drawImage(darkCanvas, 0, 0);
	ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Easing helpers
// ─────────────────────────────────────────────────────────────────────────────
function _easeInQuad(t) {
	return t * t;
}

function _showVeilWarning(urgent = false) {
	if (!veilWarning) return;
	veilWarning.classList.add('visible');
	if (urgent) {
		veilWarning.classList.add('urgent');
		_setVeilStatus('Sương mù đang dày');
	} else {
		veilWarning.classList.remove('urgent');
	}
}

function _hideVeilWarning() {
	if (!veilWarning) return;
	veilWarning.classList.remove('visible');
	veilWarning.classList.remove('urgent');
}

function _updateWarningUI(ratio) {
	if (!veilWarning) return;

	// Hiện warning UI khi ratio > 40%
	if (ratio > 0.40) {
		_showVeilWarning(ratio >= 0.92);
		if (veilProgress) {
			veilProgress.style.width = `${ratio * 100}%`;
		}
		if (ratio < 0.7) {
			_setVeilStatus('Sương đang lên');
		} else {
			_setVeilStatus('Sương đang dày');
		}
	} else {
		_hideVeilWarning();
	}
}

function _setVeilStatus(label) {
	if (veilLabel) veilLabel.innerText = label;
}

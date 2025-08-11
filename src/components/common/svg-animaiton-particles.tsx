"use client";

import { useRef, useEffect, useState } from "react";

interface LogoParticlesProps {
	svgPath: string;
	svgViewBox?: string;
	logoWidth?: number;
	logoHeight?: number;
	particleColor?: string;
	scatteredColor?: string;
	backgroundColor?: string;
}

export function LogoParticles({
	svgPath,
	svgViewBox = "0 0 100 100",
	logoWidth = 200,
	logoHeight = 100,
	particleColor = "white",
	scatteredColor = "#00DCFF",
	backgroundColor = "black",
}: LogoParticlesProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const mousePositionRef = useRef({ x: 0, y: 0 });
	const isTouchingRef = useRef(false);
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const updateCanvasSize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			setIsMobile(window.innerWidth < 768);
		};

		updateCanvasSize();

		let particles: {
			x: number;
			y: number;
			baseX: number;
			baseY: number;
			size: number;
			life: number;
		}[] = [];

		let textImageData: ImageData | null = null;

		function createTextImage() {
			if (!ctx || !canvas) return 0;

			ctx.fillStyle = particleColor;
			ctx.save();

			const responsiveWidth = isMobile ? logoWidth * 0.6 : logoWidth;
			const responsiveHeight = isMobile ? logoHeight * 0.6 : logoHeight;

			ctx.translate(
				canvas.width / 2 - responsiveWidth / 2,
				canvas.height / 2 - responsiveHeight / 2
			);

			// Parse viewBox to get original dimensions
			const viewBoxParts = svgViewBox.split(" ").map(Number);
			const originalWidth = viewBoxParts[2] - viewBoxParts[0];
			const originalHeight = viewBoxParts[3] - viewBoxParts[1];

			const scaleX = responsiveWidth / originalWidth;
			const scaleY = responsiveHeight / originalHeight;

			ctx.scale(scaleX, scaleY);
			ctx.translate(-viewBoxParts[0], -viewBoxParts[1]);

			const path = new Path2D(svgPath);
			ctx.fill(path);

			ctx.restore();

			textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			return Math.max(scaleX, scaleY);
		}

		function createParticle(scale: number) {
			if (!ctx || !canvas || !textImageData) return null;

			const data = textImageData.data;

			for (let attempt = 0; attempt < 100; attempt++) {
				const x = Math.floor(Math.random() * canvas.width);
				const y = Math.floor(Math.random() * canvas.height);

				if (data[(y * canvas.width + x) * 4 + 3] > 128) {
					return {
						x: x,
						y: y,
						baseX: x,
						baseY: y,
						size: Math.random() * 1 + 0.5,
						life: Math.random() * 100 + 50,
					};
				}
			}

			return null;
		}

		function createInitialParticles(scale: number) {
			const baseParticleCount = 5000;
			const particleCount = Math.floor(
				baseParticleCount *
					Math.sqrt(
						((canvas?.width ?? 0) * (canvas?.height ?? 0)) /
							(1920 * 1080)
					)
			);
			for (let i = 0; i < particleCount; i++) {
				const particle = createParticle(scale);
				if (particle) particles.push(particle);
			}
		}

		let animationFrameId: number;

		function animate(scale: number) {
			if (!ctx || !canvas) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const { x: mouseX, y: mouseY } = mousePositionRef.current;
			const maxDistance = 240;

			for (let i = 0; i < particles.length; i++) {
				const p = particles[i];
				const dx = mouseX - p.x;
				const dy = mouseY - p.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (
					distance < maxDistance &&
					(isTouchingRef.current || !("ontouchstart" in window))
				) {
					const force = (maxDistance - distance) / maxDistance;
					const angle = Math.atan2(dy, dx);
					const moveX = Math.cos(angle) * force * 60;
					const moveY = Math.sin(angle) * force * 60;
					p.x = p.baseX - moveX;
					p.y = p.baseY - moveY;

					ctx.fillStyle = scatteredColor;
				} else {
					p.x += (p.baseX - p.x) * 0.1;
					p.y += (p.baseY - p.y) * 0.1;
					ctx.fillStyle = particleColor;
				}

				ctx.fillRect(p.x, p.y, p.size, p.size);

				p.life--;
				if (p.life <= 0) {
					const newParticle = createParticle(scale);
					if (newParticle) {
						particles[i] = newParticle;
					} else {
						particles.splice(i, 1);
						i--;
					}
				}
			}

			const baseParticleCount = 5000;
			const targetParticleCount = Math.floor(
				baseParticleCount *
					Math.sqrt((canvas.width * canvas.height) / (1920 * 1080))
			);
			while (particles.length < targetParticleCount) {
				const newParticle = createParticle(scale);
				if (newParticle) particles.push(newParticle);
			}

			animationFrameId = requestAnimationFrame(() => animate(scale));
		}

		const scale = createTextImage();
		createInitialParticles(scale);
		animate(scale);

		const handleResize = () => {
			updateCanvasSize();
			const newScale = createTextImage();
			particles = [];
			createInitialParticles(newScale);
		};

		const handleMove = (x: number, y: number) => {
			mousePositionRef.current = { x, y };
		};

		const handleMouseMove = (e: MouseEvent) => {
			handleMove(e.clientX, e.clientY);
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (e.touches.length > 0) {
				e.preventDefault();
				handleMove(e.touches[0].clientX, e.touches[0].clientY);
			}
		};

		const handleTouchStart = () => {
			isTouchingRef.current = true;
		};

		const handleTouchEnd = () => {
			isTouchingRef.current = false;
			mousePositionRef.current = { x: 0, y: 0 };
		};

		const handleMouseLeave = () => {
			if (!("ontouchstart" in window)) {
				mousePositionRef.current = { x: 0, y: 0 };
			}
		};

		window.addEventListener("resize", handleResize);
		canvas.addEventListener("mousemove", handleMouseMove);
		canvas.addEventListener("touchmove", handleTouchMove, {
			passive: false,
		});
		canvas.addEventListener("mouseleave", handleMouseLeave);
		canvas.addEventListener("touchstart", handleTouchStart);
		canvas.addEventListener("touchend", handleTouchEnd);

		return () => {
			window.removeEventListener("resize", handleResize);
			canvas.removeEventListener("mousemove", handleMouseMove);
			canvas.removeEventListener("touchmove", handleTouchMove);
			canvas.removeEventListener("mouseleave", handleMouseLeave);
			canvas.removeEventListener("touchstart", handleTouchStart);
			canvas.removeEventListener("touchend", handleTouchEnd);
			cancelAnimationFrame(animationFrameId);
		};
	}, [
		isMobile,
		svgPath,
		svgViewBox,
		logoWidth,
		logoHeight,
		particleColor,
		scatteredColor,
		backgroundColor,
	]);

	return (
		<div
			className="relative w-full h-full flex flex-col items-center justify-center"
			style={{ backgroundColor }}
		>
			<canvas
				ref={canvasRef}
				className="w-full h-full absolute top-0 left-0 touch-none"
				aria-label="Interactive particle effect with custom logo"
			/>
		</div>
	);
}

const PATH =
	"M80.5511 3.0909H96.8871V132.119C96.8288 143.766 94.7323 153.492 90.5973 161.296C86.4624 169.042 80.755 174.837 73.4751 178.68C66.1953 182.524 57.8381 184.446 48.4034 184.446C39.1435 184.446 30.8736 182.728 23.5938 179.292C16.3139 175.856 10.5774 171.022 6.38423 164.79C2.24929 158.559 0.181819 151.25 0.181819 142.864H16.2557C16.2557 148.163 17.6534 152.852 20.4489 156.928C23.2443 160.947 27.059 164.092 31.8928 166.363C36.7848 168.634 42.2884 169.77 48.4034 169.77C54.7514 169.77 60.3132 168.43 65.0888 165.751C69.9226 163.072 73.7081 158.967 76.4453 153.434C79.1825 147.843 80.5511 140.738 80.5511 132.119V3.0909ZM161.892 182H144.77L209.851 3.0909H227.323L292.405 182H275.283L219.199 24.3189H217.976L161.892 182ZM174.209 113.424H262.965V128.1H174.209V113.424ZM340.287 182V3.0909H398.031C410.727 3.0909 421.326 5.39133 429.829 9.99219C438.39 14.5348 444.826 20.8537 449.135 28.9489C453.503 36.9858 455.687 46.2166 455.687 56.6413C455.687 67.066 453.503 76.2678 449.135 84.2464C444.826 92.2251 438.419 98.4567 429.917 102.941C421.414 107.425 410.873 109.668 398.293 109.668H349.11V94.7294H397.856C407.174 94.7294 414.92 93.1861 421.093 90.0994C427.325 87.0128 431.955 82.6158 434.983 76.9084C438.07 71.201 439.613 64.4453 439.613 56.6413C439.613 48.8374 438.07 42.0234 434.983 36.1996C431.897 30.3175 427.238 25.7749 421.006 22.5717C414.833 19.3686 407.029 17.767 397.594 17.767H356.623V182H340.287ZM419.172 101.281L463.2 182H444.331L400.739 101.281H419.172ZM509.357 3.0909L565.266 160.772H566.839L622.748 3.0909H639.87L574.788 182H557.317L492.235 3.0909H509.357ZM704.089 3.0909V182H687.753V3.0909H704.089ZM866.017 47.8182C865.027 37.8594 860.63 29.9389 852.826 24.0568C845.022 18.1747 835.209 15.2337 823.386 15.2337C815.058 15.2337 807.72 16.6605 801.372 19.5142C795.082 22.3679 790.132 26.3281 786.521 31.3949C782.969 36.4034 781.192 42.1108 781.192 48.517C781.192 53.2344 782.212 57.3693 784.25 60.9219C786.288 64.4744 789.026 67.532 792.462 70.0945C795.956 72.5987 799.8 74.7535 803.993 76.5589C808.244 78.3643 812.525 79.8785 816.835 81.1016L835.704 86.5178C841.411 88.0902 847.119 90.0994 852.826 92.5455C858.533 94.9915 863.746 98.0781 868.463 101.805C873.239 105.474 877.053 109.988 879.907 115.346C882.819 120.646 884.275 127.023 884.275 134.477C884.275 144.028 881.8 152.619 876.849 160.248C871.899 167.877 864.794 173.934 855.534 178.418C846.274 182.844 835.18 185.058 822.251 185.058C810.079 185.058 799.509 183.048 790.54 179.03C781.571 174.953 774.524 169.333 769.399 162.17C764.274 155.006 761.391 146.707 760.751 137.273H777.523C778.106 144.32 780.435 150.289 784.512 155.181C788.589 160.073 793.889 163.8 800.411 166.363C806.934 168.867 814.214 170.119 822.251 170.119C831.161 170.119 839.082 168.634 846.012 165.664C853.001 162.636 858.475 158.442 862.435 153.085C866.454 147.668 868.463 141.379 868.463 134.215C868.463 128.158 866.891 123.092 863.746 119.015C860.601 114.88 856.204 111.415 850.555 108.619C844.964 105.824 838.47 103.349 831.074 101.194L809.671 94.9041C795.636 90.7109 784.745 84.9162 776.999 77.5199C769.254 70.1236 765.381 60.6889 765.381 49.2159C765.381 39.6065 767.943 31.1619 773.068 23.8821C778.251 16.544 785.24 10.8366 794.034 6.75993C802.886 2.62499 812.816 0.557519 823.823 0.557519C834.947 0.557519 844.789 2.59587 853.35 6.67259C861.911 10.7493 868.696 16.3693 873.705 23.5327C878.771 30.6378 881.479 38.7329 881.829 47.8182H866.017Z";

export default function SvgAnimationParticles() {
	return (
		<LogoParticles
			svgPath={PATH}
			svgViewBox="0 0 847 185"
			logoWidth={1300}
			logoHeight={284}
			particleColor="white"
			scatteredColor="#fffff"
			backgroundColor="transparent"
		/>
	);
}

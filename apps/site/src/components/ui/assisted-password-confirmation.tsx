import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AssistedPasswordConfirmation({
	password,
}: { password: string }) {
	const [confirmPassword, setConfirmPassword] = useState("");
	const [shake, setShake] = useState(false);

	const handleConfirmPasswordChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		if (
			confirmPassword.length >= password.length &&
			e.target.value.length > confirmPassword.length
		) {
			setShake(true);
		} else {
			setConfirmPassword(e.target.value);
		}
	};

	useEffect(() => {
		if (shake) {
			const timer = setTimeout(() => setShake(false), 500);
			return () => clearTimeout(timer);
		}
	}, [shake]);

	const getLetterStatus = (letter: string, index: number) => {
		if (!confirmPassword[index]) return "";
		return confirmPassword[index] === letter
			? "bg-green-500/20"
			: "bg-red-500/20";
	};

	const passwordsMatch = password === confirmPassword;

	const bounceAnimation = {
		x: shake ? [-10, 10, -10, 10, 0] : 0,
		transition: { duration: 0.5 },
	};

	const matchAnimation = {
		scale: passwordsMatch ? [1, 1.05, 1] : 1,
		transition: { duration: 0.3 },
	};

	const borderAnimation = {
		borderColor: passwordsMatch ? "#10B981" : "",
		transition: { duration: 0.3 },
	};

	return (
		<div className="relative flex w-full flex-col items-start justify-center space-y-2">
			<div className="relative w-full">
				<motion.div
					className="h-[52px] w-full rounded-xl border-2 bg-white px-2 py-2"
					animate={{
						...bounceAnimation,
						...matchAnimation,
						...borderAnimation,
					}}
				>
					<div className="relative h-full w-fit overflow-hidden rounded-lg">
						<div className="z-10 flex h-full items-center justify-center bg-transparent px-0 py-1 tracking-[0.15em]">
							{password.split("").map((_, index) => (
								<div
									key={index}
									className="flex h-full w-4 shrink-0 items-center justify-center"
								>
									<span className="size-[5px] rounded-full bg-black"></span>
								</div>
							))}
						</div>
						<div className="absolute bottom-0 left-0 top-0 z-0 flex h-full w-full items-center justify-start">
							{password.split("").map((letter, index) => (
								<motion.div
									key={index}
									className={`ease absolute h-full w-4 transition-all duration-300 ${getLetterStatus(
										letter,
										index,
									)}`}
									style={{
										left: `${index * 16}px`,
										scaleX: confirmPassword[index] ? 1 : 0,
										transformOrigin: "left",
									}}
								></motion.div>
							))}
						</div>
					</div>
				</motion.div>

				<motion.input
					className="mt-2 h-[52px] w-full rounded-xl border-2 bg-white px-3.5 py-3 tracking-[0.4em] outline-none placeholder:tracking-normal focus:border-slate-900 text-gray-900"
					type="password"
					placeholder="Confirm Password"
					value={confirmPassword}
					onChange={handleConfirmPasswordChange}
					animate={borderAnimation}
				/>
			</div>
		</div>
	);
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/i18n/useAppLocale";
import { Search } from "lucide-react";

export default function HeaderSearch() {
	const { locale } = useAppLocale();
	const t = useTranslations("search.header");
	const router = useRouter();
	const sp = useSearchParams();

	const qFromUrl = sp.get("q") ?? "";
	const [q, setQ] = useState(qFromUrl);

	useEffect(() => {
		setQ(qFromUrl);
	}, [qFromUrl]);

	function go() {
		const trimmed = q.trim();
		if (!trimmed) return;
		const next = new URLSearchParams();
		next.set("q", trimmed);
		next.set("page", "1");
		next.set("pageSize", sp.get("pageSize") ?? "20");
		router.push(`/${locale}/search?${next.toString()}`);
	}

	return (
		<div className="relative w-full">
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				value={q}
				onChange={(e) => setQ(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") go();
					if (e.key === "Escape") setQ("");
				}}
				placeholder={t("placeholder")}
				className="pl-10"
				aria-label={t("ariaLabel")}
			/>
		</div>
	);
}

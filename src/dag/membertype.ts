export interface Member {
    badges: {
        bgColor: string;
        label: string;
        textColor: string;
    }[];
    sex: "M" | "F";
    subtitles: string;
    title: string;
    titleBgColor: string;
    titleTextColor: string;
    imageUrl?: string | null;
}
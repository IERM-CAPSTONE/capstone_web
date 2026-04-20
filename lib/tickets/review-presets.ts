export type ReviewIssuePreset = {
    code: string;
    issueType: "Technical Issue" | "Academic Violation" | "Room Management" | "Face Mismatch";
    viLabel: string;
};

export type ReviewResolutionPreset = {
    code: string;
    issueCodes: string[];
    viLabel: string;
    viText: string;
};

export const reviewIssuePresets: ReviewIssuePreset[] = [
    { code: "cannotLogin", issueType: "Technical Issue", viLabel: "Kh\u00f4ng \u0111\u0103ng nh\u1eadp \u0111\u01b0\u1ee3c" },
    { code: "eosClientError", issueType: "Technical Issue", viLabel: "EOSClient / Ph\u1ea7n m\u1ec1m thi b\u1ecb l\u1ed7i" },
    { code: "spinningScreen", issueType: "Technical Issue", viLabel: "M\u00e0n h\u00ecnh xoay li\u00ean t\u1ee5c" },
    { code: "needReassign", issueType: "Technical Issue", viLabel: "C\u1ea7n reassign do \u0111\u00e3 \u0111\u0103ng nh\u1eadp r\u1ed3i" },
    { code: "lostServerConn", issueType: "Technical Issue", viLabel: "M\u1ea5t k\u1ebft n\u1ed1i server thi" },
    { code: "wrongExamCode", issueType: "Technical Issue", viLabel: "Sai m\u00e3 thi" },
    { code: "notInExamList", issueType: "Room Management", viLabel: "Kh\u00f4ng c\u00f3 trong danh s\u00e1ch thi" },
    { code: "deviceViolation", issueType: "Academic Violation", viLabel: "S\u1eed d\u1ee5ng thi\u1ebft b\u1ecb tr\u00e1i ph\u00e9p" },
    { code: "cheatingBehavior", issueType: "Academic Violation", viLabel: "H\u00e0nh vi gian l\u1eadn" },
    { code: "focusLostRepeat", issueType: "Academic Violation", viLabel: "Out m\u00e0n h\u00ecnh nhi\u1ec1u l\u1ea7n" },
    { code: "cccdMismatch", issueType: "Face Mismatch", viLabel: "Sai th\u00f4ng tin CCCD" },
    { code: "submissionFailed", issueType: "Technical Issue", viLabel: "N\u1ed9p b\u00e0i th\u1ea5t b\u1ea1i" },
    { code: "hardwareFailure", issueType: "Technical Issue", viLabel: "M\u00e1y t\u00ednh h\u1ecfng, m\u1ea5t ngu\u1ed3n" },
    { code: "wrongFileFormat", issueType: "Technical Issue", viLabel: "Sai \u0111\u1ecbnh d\u1ea1ng file n\u1ed9p b\u00e0i" },
    { code: "roomIssue", issueType: "Room Management", viLabel: "S\u1ef1 c\u1ed1 ph\u00f2ng thi kh\u00e1c" },
];

export const reviewResolutionPresets: ReviewResolutionPreset[] = [
    {
        code: "REFRESH_AND_RELOGIN",
        issueCodes: ["cannotLogin", "spinningScreen"],
        viLabel: "Refresh v\u00e0 \u0111\u0103ng nh\u1eadp l\u1ea1i",
        viText: "\u0110\u00e3 h\u01b0\u1edbng d\u1eabn \u0111\u0103ng nh\u1eadp l\u1ea1i v\u00e0 l\u00e0m m\u1edbi \u1ee9ng d\u1ee5ng, h\u1ec7 th\u1ed1ng ho\u1ea1t \u0111\u1ed9ng b\u00ecnh th\u01b0\u1eddng.",
    },
    {
        code: "RESET_PASSWORD_GUIDE",
        issueCodes: ["cannotLogin"],
        viLabel: "H\u01b0\u1edbng d\u1eabn reset m\u1eadt kh\u1ea9u",
        viText: "\u0110\u00e3 h\u01b0\u1edbng d\u1eabn reset th\u00f4ng tin \u0111\u0103ng nh\u1eadp v\u00e0 x\u00e1c nh\u1eadn truy c\u1eadp \u0111\u01b0\u1ee3c h\u1ec7 th\u1ed1ng thi.",
    },
    {
        code: "REASSIGN_ACCOUNT",
        issueCodes: ["needReassign"],
        viLabel: "C\u1ea5p l\u1ea1i phi\u00ean \u0111\u0103ng nh\u1eadp",
        viText: "\u0110\u00e3 x\u00e1c nh\u1eadn t\u00e0i kho\u1ea3n c\u1ea7n re-assign v\u00e0 chuy\u1ec3n x\u1eed l\u00fd theo \u0111\u00fang quy tr\u00ecnh.",
    },
    {
        code: "CHECK_NETWORK_AND_RECONNECT",
        issueCodes: ["lostServerConn"],
        viLabel: "Ki\u1ec3m tra m\u1ea1ng v\u00e0 k\u1ebft n\u1ed1i l\u1ea1i",
        viText: "\u0110\u00e3 ki\u1ec3m tra k\u1ebft n\u1ed1i m\u1ea1ng, th\u1ef1c hi\u1ec7n k\u1ebft n\u1ed1i l\u1ea1i v\u00e0 x\u00e1c nh\u1eadn phi\u00ean thi ti\u1ebfp t\u1ee5c \u1ed5n \u0111\u1ecbnh.",
    },
    {
        code: "RESTART_CLIENT",
        issueCodes: ["eosClientError", "spinningScreen", "hardwareFailure"],
        viLabel: "Kh\u1edfi \u0111\u1ed9ng l\u1ea1i ph\u1ea7n m\u1ec1m thi",
        viText: "\u0110\u00e3 kh\u1edfi \u0111\u1ed9ng l\u1ea1i ph\u1ea7n m\u1ec1m thi v\u00e0 x\u00e1c nh\u1eadn m\u00e0n h\u00ecnh thi hi\u1ec3n th\u1ecb \u0111\u00fang.",
    },
    {
        code: "CORRECT_EXAM_CODE",
        issueCodes: ["wrongExamCode"],
        viLabel: "\u0110\u00ednh ch\u00ednh m\u00e3 thi",
        viText: "\u0110\u00e3 \u0111\u1ed1i chi\u1ebfu v\u00e0 \u0111\u00ednh ch\u00ednh l\u1ea1i ExamCode, sau \u0111\u00f3 x\u00e1c nh\u1eadn truy c\u1eadp \u0111\u00fang \u0111\u1ec1 thi.",
    },
    {
        code: "VERIFY_LIST_AND_ESCALATE",
        issueCodes: ["notInExamList", "roomIssue"],
        viLabel: "Ki\u1ec3m tra danh s\u00e1ch v\u00e0 chuy\u1ec3n b\u1ed9 ph\u1eadn li\u00ean quan",
        viText: "\u0110\u00e3 ki\u1ec3m tra danh s\u00e1ch thi v\u00e0 chuy\u1ec3n x\u1eed l\u00fd cho b\u1ed9 ph\u1eadn li\u00ean quan theo quy tr\u00ecnh.",
    },
    {
        code: "VERIFY_AND_WARN",
        issueCodes: ["deviceViolation", "cheatingBehavior", "focusLostRepeat"],
        viLabel: "X\u00e1c minh v\u00e0 nh\u1eafc nh\u1edf",
        viText: "\u0110\u00e3 x\u00e1c minh t\u00ecnh hu\u1ed1ng, nh\u1eafc nh\u1edf th\u00ed sinh v\u00e0 ghi nh\u1eadn x\u1eed l\u00fd theo quy \u0111\u1ecbnh ph\u00f2ng thi.",
    },
    {
        code: "VERIFY_IDENTITY",
        issueCodes: ["cccdMismatch"],
        viLabel: "X\u00e1c minh danh t\u00ednh",
        viText: "\u0110\u00e3 \u0111\u1ed1i chi\u1ebfu th\u00f4ng tin danh t\u00ednh v\u00e0 x\u00e1c nh\u1eadn l\u1ea1i d\u1eef li\u1ec7u nh\u1eadn di\u1ec7n cho th\u00ed sinh.",
    },
    {
        code: "RESUBMIT_OR_RETRY",
        issueCodes: ["submissionFailed", "wrongFileFormat"],
        viLabel: "H\u01b0\u1edbng d\u1eabn n\u1ed9p l\u1ea1i",
        viText: "\u0110\u00e3 h\u01b0\u1edbng d\u1eabn ki\u1ec3m tra \u0111\u1ecbnh d\u1ea1ng v\u00e0 thao t\u00e1c n\u1ed9p b\u00e0i l\u1ea1i, x\u00e1c nh\u1eadn k\u1ebft qu\u1ea3 sau x\u1eed l\u00fd.",
    },
    {
        code: "ESCALATE_EXAM_OFFICER",
        issueCodes: reviewIssuePresets.map((preset) => preset.code),
        viLabel: "Chuy\u1ec3n kh\u1ea3o th\u00ed",
        viText: "\u0110\u00e3 ti\u1ebfp nh\u1eadn v\u00e0 chuy\u1ec3n x\u1eed l\u00fd cho b\u1ed9 ph\u1eadn kh\u1ea3o th\u00ed \u0111\u1ec3 ti\u1ebfp t\u1ee5c theo d\u00f5i.",
    },
];

export function getIssuePreset(code?: string | null) {
    return reviewIssuePresets.find((preset) => preset.code === code) ?? null;
}

export function getResolutionPresetsForIssue(issueCode: string) {
    return reviewResolutionPresets.filter((preset) => preset.issueCodes.includes(issueCode));
}

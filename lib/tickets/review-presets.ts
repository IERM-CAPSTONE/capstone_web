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
    { code: "cannotLogin", issueType: "Technical Issue", viLabel: "Không đăng nhập được" },
    { code: "eosClientError", issueType: "Technical Issue", viLabel: "EOSClient / Phần mềm thi bị lỗi" },
    { code: "spinningScreen", issueType: "Technical Issue", viLabel: "Màn hình xoay liên tục" },
    { code: "needReassign", issueType: "Technical Issue", viLabel: "Cần reassign do đã đăng nhập rồi" },
    { code: "lostServerConn", issueType: "Technical Issue", viLabel: "Mất kết nối server thi" },
    { code: "wrongExamCode", issueType: "Technical Issue", viLabel: "Sai mã thi" },
    { code: "notInExamList", issueType: "Room Management", viLabel: "Không có trong danh sách thi" },
    { code: "deviceViolation", issueType: "Academic Violation", viLabel: "Sử dụng thiết bị trái phép" },
    { code: "cheatingBehavior", issueType: "Academic Violation", viLabel: "Hành vi gian lận" },
    { code: "focusLostRepeat", issueType: "Academic Violation", viLabel: "Out màn hình nhiều lần" },
    { code: "cccdMismatch", issueType: "Face Mismatch", viLabel: "Sai thông tin CCCD" },
    { code: "submissionFailed", issueType: "Technical Issue", viLabel: "Nộp bài thất bại" },
    { code: "hardwareFailure", issueType: "Technical Issue", viLabel: "Máy tính hỏng, mất nguồn" },
    { code: "wrongFileFormat", issueType: "Technical Issue", viLabel: "Sai định dạng file nộp bài" },
    { code: "roomIssue", issueType: "Room Management", viLabel: "Sự cố phòng thi khác" },
];

export const reviewResolutionPresets: ReviewResolutionPreset[] = [
    {
        code: "REFRESH_AND_RELOGIN",
        issueCodes: ["cannotLogin", "spinningScreen"],
        viLabel: "Refresh và đăng nhập lại",
        viText: "Đã hướng dẫn đăng nhập lại và làm mới ứng dụng, hệ thống hoạt động bình thường.",
    },
    {
        code: "RESET_PASSWORD_GUIDE",
        issueCodes: ["cannotLogin"],
        viLabel: "Hướng dẫn reset mật khẩu",
        viText: "Đã hướng dẫn reset thông tin đăng nhập và xác nhận truy cập được hệ thống thi.",
    },
    {
        code: "REASSIGN_ACCOUNT",
        issueCodes: ["needReassign"],
        viLabel: "Cấp lại phiên đăng nhập",
        viText: "Đã xác nhận tài khoản cần re-assign và chuyển xử lý theo đúng quy trình.",
    },
    {
        code: "CHECK_NETWORK_AND_RECONNECT",
        issueCodes: ["lostServerConn"],
        viLabel: "Kiểm tra mạng và kết nối lại",
        viText: "Đã kiểm tra kết nối mạng, thực hiện kết nối lại và xác nhận phiên thi tiếp tục ổn định.",
    },
    {
        code: "RESTART_CLIENT",
        issueCodes: ["eosClientError", "spinningScreen", "hardwareFailure"],
        viLabel: "Khởi động lại phần mềm thi",
        viText: "Đã khởi động lại phần mềm thi và xác nhận màn hình thi hiển thị đúng.",
    },
    {
        code: "CORRECT_EXAM_CODE",
        issueCodes: ["wrongExamCode"],
        viLabel: "Đính chính mã thi",
        viText: "Đã đối chiếu và đính chính lại ExamCode, sau đó xác nhận truy cập đúng đề thi.",
    },
    {
        code: "VERIFY_LIST_AND_ESCALATE",
        issueCodes: ["notInExamList", "roomIssue"],
        viLabel: "Kiểm tra danh sách và chuyển bộ phận liên quan",
        viText: "Đã kiểm tra danh sách thi và chuyển xử lý cho bộ phận liên quan theo quy trình.",
    },
    {
        code: "VERIFY_AND_WARN",
        issueCodes: ["deviceViolation", "cheatingBehavior", "focusLostRepeat"],
        viLabel: "Xác minh và nhắc nhở",
        viText: "Đã xác minh tình huống, nhắc nhở thí sinh và ghi nhận xử lý theo quy định phòng thi.",
    },
    {
        code: "VERIFY_IDENTITY",
        issueCodes: ["cccdMismatch"],
        viLabel: "Xác minh danh tính",
        viText: "Đã đối chiếu thông tin danh tính và xác nhận lại dữ liệu nhận diện cho thí sinh.",
    },
    {
        code: "RESUBMIT_OR_RETRY",
        issueCodes: ["submissionFailed", "wrongFileFormat"],
        viLabel: "Hướng dẫn nộp lại",
        viText: "Đã hướng dẫn kiểm tra định dạng và thao tác nộp bài lại, xác nhận kết quả sau xử lý.",
    },
    {
        code: "ESCALATE_EXAM_OFFICER",
        issueCodes: reviewIssuePresets.map((preset) => preset.code),
        viLabel: "Chuyển khảo thí",
        viText: "Đã tiếp nhận và chuyển xử lý cho bộ phận khảo thí để tiếp tục theo dõi.",
    },
];

export function getIssuePreset(code?: string | null) {
    return reviewIssuePresets.find((preset) => preset.code === code) ?? null;
}

export function getResolutionPresetsForIssue(issueCode: string) {
    return reviewResolutionPresets.filter((preset) => preset.issueCodes.includes(issueCode));
}

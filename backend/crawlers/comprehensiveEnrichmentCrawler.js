const crypto = require("crypto");
const pool = require("../db/mysql");

function normalizeKeyword(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createProductKey(platform, url, name) {
  const p = normalizeKeyword(platform || "Tiki");
  const u = String(url || "").trim();
  const n = normalizeKeyword(name || "");
  if (u) return `${p}|${u}`;
  return `${p}|${n}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Danh sách các chủ đề cào dữ liệu toàn diện mở rộng:
// Bao gồm: Bố, Mẹ, Em trai, Em gái, Anh trai, Chị gái, Người yêu (Nam/Nữ), Người yêu cũ, Trẻ em/Thiếu nhi, Đồng nghiệp/Sếp, Thầy cô
// Và các dịp: Sinh nhật, Valentine, 8/3, 20/10, Ngày của Mẹ, Ngày của Cha, 20/11, Noel, Tết, Tân gia, Tốt nghiệp, Khai trương, Trung thu/1/6, Chữa lành/Xin lỗi/Chia tay văn minh
const ENRICHMENT_TOPICS = [
  // ================= 1. QUÀ BỐ / NGÀY CỦA CHA / TRUNG NIÊN NAM =================
  {
    query: "máy cạo râu điện 3 lưỡi chính hãng",
    category: "Chăm Sóc Nam Giới",
    tags: "quà bố cha ba ông quà tặng sinh nhật ngày của cha phụ kiện nam thiết thực máy cạo râu",
  },
  {
    query: "gối massage cổ vai gáy hồng ngoại",
    category: "Sức Khỏe & Gia Đình",
    tags: "quà bố mẹ cha ông bà sức khỏe massage cổ vai gáy thư giãn sinh nhật ngày của cha ngày của mẹ",
  },
  {
    query: "bộ ấm chén pha trà gốm sứ tử sa",
    category: "Gia Dụng & Trà Đạo",
    tags: "ấm chén trà tử sa gốm sứ quà biếu bố ông sếp sếp nam tân gia ngày của cha tết",
  },
  {
    query: "trà ô long cao cấp hộp quà",
    category: "Trà & Sức Khỏe",
    tags: "trà ô long trà shan tuyết quà biếu bố sếp thầy giáo ngày của cha tết sức khỏe",
  },
  {
    query: "máy đo huyết áp bắp tay omron chính hãng",
    category: "Sức Khỏe & Gia Đình",
    tags: "máy đo huyết áp omron sức khỏe gia đình quà tặng bố mẹ ông bà ngày của cha ngày của mẹ",
  },
  {
    query: "đông trùng hạ thảo sấy thăng hoa hộp quà",
    category: "Quà Sức Khỏe Cao Cấp",
    tags: "đông trùng hạ thảo bồi bổ sức khỏe quà tặng bố mẹ sếp ngày của cha tết",
  },
  {
    query: "áo sơ mi nam trung niên cao cấp",
    category: "Thời Trang Nam",
    tags: "áo sơ mi nam trung niên lịch sự quà tặng bố thầy giáo ngày của cha 20/11",
  },
  {
    query: "thắt lưng nam da bò khóa tự động",
    category: "Phụ Kiện Nam",
    tags: "thắt lưng nam da bò dây nịt quà bố chồng anh trai sếp sinh nhật ngày của cha",
  },

  // ================= 2. QUÀ MẸ / NGÀY CỦA MẸ / TRUNG NIÊN NỮ =================
  {
    query: "bồn ngâm chân massage thư giãn gấp gọn",
    category: "Sức Khỏe & Gia Đình",
    tags: "bồn ngâm chân massage quà tặng mẹ bà phụ nữ ngày của mẹ 20/10 8/3 sức khỏe giấc ngủ",
  },
  {
    query: "hộp quà yến sào chưng sẵn cao cấp",
    category: "Quà Sức Khỏe Cao Cấp",
    tags: "yến sào yến chưng đường phèn quà tặng mẹ bà mẹ chồng 20/10 8/3 ngày của mẹ tết sức khỏe",
  },
  {
    query: "khăn lụa tơ tằm nữ cao cấp",
    category: "Thời Trang & Quà Mẹ",
    tags: "khăn lụa tơ tằm phụ kiện nữ sang trọng quà tặng mẹ cô giáo phụ nữ 20/10 8/3 20/11 ngày của mẹ",
  },
  {
    query: "kem chống lão hóa mờ nếp nhăn chính hãng",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "kem dưỡng da chống lão hóa retinol kem mắt quà tặng mẹ phụ nữ trung niên 20/10 8/3 ngày của mẹ",
  },
  {
    query: "túi xách nữ trung niên sang trọng",
    category: "Thời Trang & Quà Mẹ",
    tags: "túi xách trung niên quý phái quà tặng mẹ mẹ chồng cô giáo 20/10 8/3 ngày của mẹ",
  },
  {
    query: "vòng tay ngọc trai nhân tạo sang trọng",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "trang sức ngọc trai vòng tay quà tặng mẹ phụ nữ trung niên quý phái 20/10 8/3 ngày của mẹ",
  },
  {
    query: "nồi chiên không dầu điện tử đa năng",
    category: "Quà Tân Gia & Gia Dụng",
    tags: "nồi chiên không dầu gia dụng bếp quà mẹ vợ tân gia gia đình thiết thực",
  },

  // ================= 3. QUÀ EM TRAI / BẠN NAM TRẺ TUỔI / GAMING =================
  {
    query: "bàn phím cơ không dây switch hotswap rgb",
    category: "Gaming & Công Nghệ",
    tags: "bàn phím cơ bàn phím gaming quà em trai bạn trai nam sinh công nghệ game máy tính sinh nhật",
  },
  {
    query: "tai nghe gaming có mic chống ồn",
    category: "Gaming & Công Nghệ",
    tags: "tai nghe chụp tai gaming có mic quà em trai học sinh game thủ sinh nhật công nghệ",
  },
  {
    query: "chuột máy tính gaming không dây led rgb",
    category: "Gaming & Công Nghệ",
    tags: "chuột gaming chuột không dây quà em trai bạn trai sinh nhật máy tính",
  },
  {
    query: "bộ xếp hình lego kỹ thuật xe đua mô hình",
    category: "Đồ Chơi & Mô Hình",
    tags: "lego đồ chơi lắp ráp lego technic xe đua gundam mô hình quà em trai bé trai sinh nhật sáng tạo thiếu nhi",
  },
  {
    query: "balo nam đi học chống nước đựng laptop",
    category: "Thời Trang Nam",
    tags: "balo nam balo laptop đi học thể thao quà em trai anh trai sinh nhật nhập học tựu trường",
  },
  {
    query: "áo hoodie nam form rộng phong cách trẻ trung",
    category: "Thời Trang Nam",
    tags: "áo hoodie áo khoác nỉ unisex trẻ trung quà em trai bạn trai sinh nhật giáng sinh",
  },
  {
    query: "bình nước thể thao gym 1 lít tiện lợi",
    category: "Thể Thao & Sức Khỏe",
    tags: "bình nước thể thao tập gym quà em trai anh trai bạn bè năng động thể thao",
  },

  // ================= 4. QUÀ EM GÁI / BẠN NỮ TRẺ TUỔI / DỄ THƯƠNG =================
  {
    query: "gấu bông capybara rút nước mũi đáng yêu",
    category: "Gấu Bông & Quà Cute",
    tags: "gấu bông capybara chuột lang nước thú nhồi bông cute quà em gái bạn gái sinh nhật 20/10 thiếu nhi",
  },
  {
    query: "máy chụp ảnh mini lấy liền cho học sinh",
    category: "Công Nghệ & Nhiếp Ảnh",
    tags: "máy chụp ảnh in liền máy ảnh mini quà em gái học sinh sinh viên du lịch sinh nhật kỷ niệm",
  },
  {
    query: "bộ cọ trang điểm cá nhân mini hộp quà",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "cọ trang điểm làm đẹp quà em gái chị gái bạn nữ sinh nhật 20/10 8/3",
  },
  {
    query: "hộp bút đa năng nhiều ngăn cute học sinh",
    category: "Văn Phòng & Đời Sống",
    tags: "hộp bút túi đựng bút cute quà em gái bé gái học sinh tựu trường sinh nhật dễ thương",
  },
  {
    query: "set kẹp tóc nơ bánh bèo hàn quốc",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "kẹp tóc nơ kẹp càng cua phụ kiện tóc quà em gái bạn gái xinh xắn dưới 100k",
  },
  {
    query: "balo nữ mini vải canvas dễ thương",
    category: "Thời Trang Nữ",
    tags: "balo mini nữ túi vải canvas đi chơi đi học quà em gái chị gái sinh nhật",
  },
  {
    query: "gương trang điểm để bàn tai thỏ đèn led",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "gương trang điểm đèn led decor bàn học quà em gái bạn gái sinh nhật dễ thương",
  },

  // ================= 5. QUÀ ANH TRAI / NAM GIỚI TRƯỞNG THÀNH =================
  {
    query: "ví da bò nam sáp dáng đứng nhỏ gọn",
    category: "Phụ Kiện Nam",
    tags: "ví da nam bóp nam da thật quà anh trai bạn trai chồng sinh nhật lịch lãm",
  },
  {
    query: "tai nghe bluetooth chống ồn chủ động anc",
    category: "Công Nghệ & Âm Thanh",
    tags: "tai nghe không dây chống ồn anc bluetooth quà anh trai bạn trai công nghệ sinh nhật",
  },
  {
    query: "áo polo nam phối màu thoáng khí cao cấp",
    category: "Thời Trang Nam",
    tags: "áo polo nam công sở thể thao quà anh trai chồng bạn trai sinh nhật",
  },
  {
    query: "sáp vuốt tóc nam chính hãng giữ nếp tốt",
    category: "Chăm Sóc Nam Giới",
    tags: "sáp vuốt tóc clay sáp pomade làm đẹp nam quà anh trai em trai sinh nhật",
  },
  {
    query: "bình giữ nhiệt lock&lock inox 304 cao cấp",
    category: "Văn Phòng & Cafe",
    tags: "bình giữ nhiệt locknlock ly giữ nhiệt văn phòng quà anh trai chị gái đồng nghiệp sinh nhật",
  },
  {
    query: "đèn led kẹp màn hình máy tính chống mỏi mắt",
    category: "Đèn Decor & Gaming",
    tags: "đèn treo màn hình bảo vệ mắt làm việc lập trình quà anh trai em trai sinh nhật",
  },

  // ================= 6. QUÀ CHỊ GÁI / NỮ GIỚI TRƯỞNG THÀNH =================
  {
    query: "set son dưỡng môi có màu cao cấp hàn quốc",
    category: "Mỹ Phẩm & Làm Đẹp",
    tags: "son dưỡng có màu romand dinto mỹ phẩm quà chị gái em gái bạn gái sinh nhật 20/10 8/3",
  },
  {
    query: "máy massage mắt giảm thâm quầng mỏi mắt",
    category: "Chăm Sóc Sức Khỏe",
    tags: "máy massage mắt thư giãn giảm mỏi mắt quà chị gái dân văn phòng sinh nhật 20/10 8/3",
  },
  {
    query: "máy xông tinh dầu phun sương tạo ẩm phòng ngủ",
    category: "Nến Thơm & Thư Giãn",
    tags: "máy khuếch tán tinh dầu tạo ẩm nến thơm thư giãn quà chị gái mẹ bạn gái sinh nhật",
  },
  {
    query: "nước hoa nữ chiết 10ml mùi hương dịu ngọt",
    category: "Nước Hoa & Làm Đẹp",
    tags: "nước hoa nữ nước hoa mini thơm lâu quà chị gái em gái bạn gái 20/10 8/3 sinh nhật",
  },
  {
    query: "vòng tay bạc nữ cỏ bốn lá may mắn",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "lắc tay bạc vòng tay cỏ 4 lá may mắn quà chị gái bạn gái sinh nhật tốt nghiệp 20/10 8/3",
  },
  {
    query: "túi tote vải canvas nữ dày dặn đi làm",
    category: "Thời Trang Nữ",
    tags: "túi tote túi vải canvas thời trang nữ quà chị gái bạn nữ sinh viên sinh nhật",
  },

  // ================= 7. QUÀ NGƯỜI YÊU CŨ (EX-LOVER) - TINH TẾ, CHỮA LÀNH, VĂN MINH, KHÔNG SẾN =================
  {
    query: "sách hiểu về trái tim minh niệm",
    category: "Sách & Tri Thức",
    tags: "sách hiểu về trái tim minh niệm chữa lành tâm hồn bình an tâm lý học quà người yêu cũ nyc chia tay văn minh chúc bình an",
  },
  {
    query: "sách chữa lành đứa trẻ bên trong bạn",
    category: "Sách & Tri Thức",
    tags: "sách chữa lành phát triển bản thân tâm lý giải tỏa căng thẳng quà người yêu cũ bạn bè chúc bình an",
  },
  {
    query: "sách đại dương đen đặng hoàng giang",
    category: "Sách & Tri Thức",
    tags: "sách đại dương đen tâm lý học thấu cảm bình an quà người yêu cũ chia sẻ chiêm nghiệm",
  },
  {
    query: "nến thơm tinh dầu hoa oải hương thư giãn xoa dịu tâm trí",
    category: "Nến Thơm & Thư Giãn",
    tags: "nến thơm oải hương thư giãn giải tỏa stress chữa lành tâm trí quà người yêu cũ bạn bè tinh tế văn minh",
  },
  {
    query: "trà hoa cúc thảo mộc an thần dễ ngủ",
    category: "Trà & Sức Khỏe",
    tags: "trà hoa cúc trà thảo mộc an thần giấc ngủ ngon bình an quà người yêu cũ bố mẹ tinh tế chăm sóc sức khỏe",
  },
  {
    query: "chậu sen đá để bàn cây cảnh phong thủy mini",
    category: "Cây Cảnh & Không Gian",
    tags: "chậu cây sen đá cây để bàn làm việc may mắn sức sống bình yên quà người yêu cũ đồng nghiệp sinh nhật",
  },
  {
    query: "sổ tay bìa da a5 tối giản cao cấp ghi chép",
    category: "Văn Phòng & Đời Sống",
    tags: "sổ tay da sổ ghi chép tối giản thanh lịch quà người yêu cũ đồng nghiệp sinh nhật chúc thành công",
  },
  {
    query: "bút ký kim loại khắc tên sang trọng thanh lịch",
    category: "Văn Phòng & Cafe",
    tags: "bút ký kim loại bút bi cao cấp văn phòng quà người yêu cũ chúc công việc thăng tiến văn minh",
  },
  {
    query: "ly sứ giữ nhiệt nắp gỗ phong cách nhật bản tối giản",
    category: "Văn Phòng & Cafe",
    tags: "ly sứ cốc giữ nhiệt tối giản văn phòng quà người yêu cũ bạn bè đồng nghiệp tinh tế thiết thực",
  },

  // ================= 8. QUÀ BẠN GÁI / VỢ / NGƯỜI YÊU NỮ (VALENTINE, 20/10, 8/3, KỶ NIỆM) =================
  {
    query: "hộp hoa hồng sáp kèm dây chuyền bạc trái tim",
    category: "Hoa & Quà Lãng Mạn",
    tags: "hộp quà hoa sáp hoa hồng dây chuyền bạc trái tim quà valentine 14/2 bạn gái người yêu vợ lãng mạn kỷ niệm 20/10 8/3",
  },
  {
    query: "hộp nhạc pha lê quả cầu tuyết phát sáng xoay tròn",
    category: "Quà Lưu Niệm & Kỷ Niệm",
    tags: "quả cầu tuyết hộp nhạc pha lê lãng mạn quà sinh nhật valentine kỷ niệm giáng sinh bạn gái người yêu",
  },
  {
    query: "lắc chân bạc nữ s925 đính đá may mắn",
    category: "Trang Sức & Phụ Kiện Nữ",
    tags: "lắc chân bạc s925 trang sức nữ quà tặng bạn gái người yêu sinh nhật valentine kỷ niệm",
  },
  {
    query: "hộp socola valentine nghệ thuật handmade",
    category: "Quà Valentine & Kỷ Niệm",
    tags: "socola valentine socola chocolate ngọt ngào quà tặng bạn gái bạn trai người yêu 14/2 14/3 kỷ niệm tình yêu",
  },

  // ================= 9. QUÀ BẠN TRAI / CHỒNG / NGƯỜI YÊU NAM (VALENTINE TRẮNG, SINH NHẬT, KỶ NIỆM) =================
  {
    query: "nước hoa nam hương gỗ trầm ấm nam tính",
    category: "Nước Hoa Nam",
    tags: "nước hoa nam hương gỗ nam tính lịch lãm quà valentine sinh nhật kỷ niệm bạn trai chồng người yêu nam",
  },
  {
    query: "đồng hồ nam dây kim loại thể thao chống nước",
    category: "Đồng Hồ & Phụ Kiện Nam",
    tags: "đồng hồ nam thể thao dây thép chống nước quà sinh nhật valentine kỷ niệm bạn trai chồng",
  },
  {
    query: "vòng tay đá phong thủy nam tính bản lĩnh",
    category: "Phụ Kiện Nam",
    tags: "vòng tay phong thủy vòng đá mắt hổ quà bạn trai chồng anh trai bình an may mắn",
  },

  // ================= 10. QUÀ TRẺ EM / QUỐC TẾ THIẾU NHI 1/6 / TRUNG THU =================
  {
    query: "đồ chơi lắp ráp mô hình lego cho bé",
    category: "Đồ Chơi & Mô Hình",
    tags: "đồ chơi lego lắp ráp xếp hình phát triển trí tuệ quà trẻ em bé trai bé gái thiếu nhi 1/6 trung thu sinh nhật",
  },
  {
    query: "bộ màu sáp vẽ tranh cho trẻ em cao cấp",
    category: "Đồ Chơi & Mô Hình",
    tags: "màu sáp chì màu bút dạ tập vẽ tranh quà bé gái bé trai học sinh thiếu nhi 1/6 sáng tạo",
  },
  {
    query: "đèn lồng trung thu phát sáng có nhạc",
    category: "Lễ Hội & Sự Kiện",
    tags: "đèn lồng trung thu đèn ông sao rước đèn quà tặng trẻ em bé gái bé trai trung thu",
  },

  // ================= 11. QUÀ TỐT NGHIỆP / THĂNG CHỨC / KHAI TRƯƠNG / TÂN GIA =================
  {
    query: "bó hoa gấu bông tốt nghiệp cử nhân",
    category: "Quà Tốt Nghiệp",
    tags: "bó hoa gấu tốt nghiệp mũ cử nhân hoa hướng dương quà tốt nghiệp bạn bè bạn gái bạn trai em gái",
  },
  {
    query: "mèo thần tài vẫy tay may mắn phong thủy",
    category: "Quà Khai Trương & Phong Thủy",
    tags: "mèo thần tài vẫy tay may mắn tài lộc quà khai trương tân gia kinh doanh buôn bán sếp bạn bè",
  },
  {
    query: "bộ bát đĩa gốm sứ nhật bản cao cấp quà tặng",
    category: "Quà Tân Gia & Gia Dụng",
    tags: "bát đĩa gốm sứ phong cách nhật bộ bát ăn cơm quà tân gia mừng nhà mới cưới gia đình",
  },
  {
    query: "tượng phong thủy thuận buồm xuôi gió mạ vàng",
    category: "Quà Khai Trương & Phong Thủy",
    tags: "thuận buồm xuôi gió phong thủy mạ vàng quà thăng chức khai trương sếp đối tác đối tác làm ăn",
  },

  // ================= 12. QUÀ GIÁNG SINH (NOEL) & NĂM MỚI TẾT =================
  {
    query: "khăn choàng len giáng sinh họa tiết noel",
    category: "Quà Giáng Sinh & Lưu Niệm",
    tags: "khăn len khăn choàng noel giáng sinh ấm áp quà tặng bạn gái bạn trai người yêu em gái giáng sinh",
  },
  {
    query: "tất len vớ noel hộp quà giáng sinh dễ thương",
    category: "Quà Giáng Sinh & Lưu Niệm",
    tags: "tất noel vớ giáng sinh hộp quà noel quà tặng bạn bè em gái đồng nghiệp dưới 100k",
  },
  {
    query: "hộp quà tết các loại hạt dinh dưỡng macca hạnh nhân",
    category: "Quà Tết & Sức Khỏe",
    tags: "hộp quà tết hạt dinh dưỡng macca óc chó nho khô quà biếu tết bố mẹ ông bà sếp đối tác sang trọng",
  },
  {
    query: "giỏ quà tết trà bánh mứt cao cấp sum vầy",
    category: "Quà Tết & Sức Khỏe",
    tags: "giỏ quà tết bánh mứt trà quà biếu gia đình bố mẹ sếp năm mới sum vầy tết nguyên đán",
  },
];

async function fetchTikiViaDirectApi(query, limit = 20) {
  const url = `https://tiki.vn/api/v2/products?limit=${limit}&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`HTTP ${res.status} for query: ${query}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error(`Error fetching query "${query}":`, err.message);
    return [];
  }
}

async function runEnrichment() {
  console.log("=======================================================================");
  console.log("🚀 BẮT ĐẦU CÀO VÀ BỔ SUNG TOÀN DIỆN DỮ LIỆU SẢN PHẨM QUÀ TẶNG VÀO TIDB");
  console.log("=======================================================================");

  const conn = await pool.getConnection();
  try {
    const [initialCount] = await conn.query("SELECT COUNT(*) as c FROM scraped_products");
    console.log(`📊 Số sản phẩm hiện có trong CSDL: ${initialCount[0].c} sản phẩm.`);

    let totalSaved = 0;
    let topicIndex = 0;

    for (const topic of ENRICHMENT_TOPICS) {
      topicIndex++;
      const [existing] = await conn.query(
        "SELECT COUNT(*) as c FROM scraped_products WHERE search_keyword LIKE ?",
        [`%${normalizeKeyword(topic.query)}%`]
      );

      // Nếu đã có từ 12 sản phẩm liên quan đến từ khóa này thì bỏ qua để tiết kiệm
      if (existing[0].c >= 12) {
        console.log(
          `[${topicIndex}/${ENRICHMENT_TOPICS.length}] ⏭️ "${topic.query}" đã có ${existing[0].c} món quà, bỏ qua.`
        );
        continue;
      }

      console.log(`[${topicIndex}/${ENRICHMENT_TOPICS.length}] 🌐 Đang cào: "${topic.query}" (${topic.category})...`);
      const rawItems = await fetchTikiViaDirectApi(topic.query, 18);

      let insertedInTopic = 0;
      for (const item of rawItems) {
        if (!item || !item.name || !item.price || item.price < 10000) continue;
        let image = item.thumbnail_url || "";
        if (!image || !image.startsWith("http") || image.includes("placeholder")) {
          continue;
        }
        image = image.replace("/cache/280x280/", "/cache/450x450/");

        const productUrl = item.url_path
          ? `https://tiki.vn/${String(item.url_path).replace(/^\//, "")}`
          : "";
        if (!productUrl) continue;

        const enrichedKeyword = normalizeKeyword(
          `${topic.query} | ${topic.category} | ${topic.tags}`
        ).slice(0, 490);

        const prodKey = createProductKey("Tiki", productUrl, item.name).slice(0, 490);
        const rating = item.rating_average ? Number(item.rating_average) : 4.8;
        const score = Math.round(rating * 19);

        await conn.query(
          `
          INSERT INTO scraped_products (
            product_key, platform, name, price, currency, image, url,
            condition_name, category, location, search_keyword, score, reason,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            price = VALUES(price),
            image = VALUES(image),
            category = VALUES(category),
            search_keyword = VALUES(search_keyword),
            updated_at = NOW()
          `,
          [
            prodKey,
            "Tiki",
            String(item.name).trim(),
            Number(item.price),
            "VND",
            image,
            productUrl,
            "New",
            topic.category,
            "Vietnam",
            enrichedKeyword,
            score,
            `Gợi ý hoàn hảo cho chủ đề: ${topic.category}`,
          ]
        );
        insertedInTopic++;
      }

      totalSaved += insertedInTopic;
      console.log(
        `   ✅ Đã lưu ${insertedInTopic} món quà cho chủ đề "${topic.query}"`
      );

      // Nghỉ nhẹ 300ms giữa các request để tránh rate limit
      await sleep(300);
    }

    const [finalCount] = await conn.query("SELECT COUNT(*) as c FROM scraped_products");
    const [finalCats] = await conn.query(
      "SELECT category, COUNT(*) as count FROM scraped_products GROUP BY category ORDER BY count DESC LIMIT 20"
    );

    console.log("\n=======================================================================");
    console.log(`🎉 HOÀN TẤT BỔ SUNG CƠ SỞ DỮ LIỆU!`);
    console.log(`✨ Đã thêm / cập nhật thành công: ${totalSaved} món quà tặng.`);
    console.log(`📦 Tổng số quà tặng trong CSDL hiện tại: ${finalCount[0].c} sản phẩm.`);
    console.log("=======================================================================");
    console.table(finalCats);
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  runEnrichment()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("Enrichment crawler error:", e);
      process.exit(1);
    });
}

module.exports = { runEnrichment, ENRICHMENT_TOPICS };

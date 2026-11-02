const pool = require("./mysql");

const SEED_PRODUCTS = [
  // ==========================================
  // BẠN GÁI / NGƯỜI YÊU / VỢ / NỮ
  // ==========================================
  {
    name: "Son môi Black Rouge Air Fit Velvet Tint Ver 9 màu đỏ thuần quyến rũ",
    price: 195000,
    category: "Mỹ phẩm & Làm đẹp",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=son+moi+black+rouge",
    tags: "son môi | bạn gái | người yêu | sinh nhật | valentine | 20/10 | 8/3 | làm đẹp"
  },
  {
    name: "Dây chuyền bạc nữ 925 đính đá cỏ 4 lá may mắn phong cách Hàn Quốc",
    price: 320000,
    category: "Trang sức & Phụ kiện",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=day+chuyen+bac+nu+co+4+la",
    tags: "dây chuyền | bạn gái | người yêu | trang sức | sinh nhật | valentine | bạc"
  },
  {
    name: "Hộp quà hoa hồng sáp thơm cao cấp kèm gấu bông và thiệp chúc mừng lãng mạn",
    price: 250000,
    category: "Quà lưu niệm",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=hop+qua+hoa+hong+sap",
    tags: "hoa hồng sáp | bạn gái | người yêu | lãng mạn | sinh nhật | valentine | 20/10"
  },
  {
    name: "Nước hoa nữ Miss Dior Blooming Bouquet Mini 20ml hương hoa cỏ ngọt ngào",
    price: 680000,
    category: "Mỹ phẩm & Làm đẹp",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=nuoc+hoa+nu+miss+dior",
    tags: "nước hoa | nước hoa nữ | bạn gái | người yêu | sinh nhật | cao cấp"
  },
  {
    name: "Túi xách nữ đeo chéo da PU mềm thời trang cao cấp khóa bấm kim loại",
    price: 390000,
    category: "Thời trang nữ",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=tui+xach+nu+deo+cheo",
    tags: "túi xách | túi nữ | bạn gái | thời trang | sinh nhật | 20/10"
  },
  {
    name: "Gấu bông Teddy khổng lồ lông mịn 1m ôm ngủ siêu mềm mại",
    price: 299000,
    category: "Thú bông & Đồ chơi",
    image: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=gau+bong+teddy",
    tags: "gấu bông | bạn gái | người yêu | dễ thương | sinh nhật | valentine"
  },
  {
    name: "Nến thơm tinh dầu hoa oải hương Lavender thư giãn giảm stress thơm phòng",
    price: 185000,
    category: "Nhà cửa & Đời sống",
    image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=nen+thom+tinh+dau",
    tags: "nến thơm | bạn gái | thư giãn | tinh dầu | sinh nhật | quà tặng"
  },
  {
    name: "Lắc tay bạc nữ đính hạt châu bạc 925 khắc tên theo yêu cầu",
    price: 280000,
    category: "Trang sức & Phụ kiện",
    image: "https://images.unsplash.com/photo-1611591475870-7607a78377f8?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=lac+tay+bac+nu",
    tags: "lắc tay | bạn gái | người yêu | trang sức | sinh nhật | bạc"
  },
  {
    name: "Máy sấy tóc ion âm đa năng tạo kiểu tóc bồng bềnh công suất 1800W",
    price: 450000,
    category: "Thiết bị điện tử",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=may+say+toc+ion+am",
    tags: "máy sấy tóc | bạn gái | gia dụng | thiết thực | sinh nhật | 20/10"
  },
  {
    name: "Đèn ngủ phi hành gia chiếu dải ngân hà 3D xoay 360 độ điều khiển từ xa",
    price: 360000,
    category: "Đồ chơi & Công nghệ",
    image: "https://images.unsplash.com/photo-1507499739999-097706ad8914?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=den+ngu+phi+hanh+gia",
    tags: "đèn ngủ | phi hành gia | công nghệ | bạn gái | bạn trai | sinh nhật"
  },

  // ==========================================
  // BẠN TRAI / NGƯỜI YÊU / CHỒNG / NAM
  // ==========================================
  {
    name: "Ví da nam da bò nguyên tấm dáng đứng cao cấp chống trộm RFID",
    price: 380000,
    category: "Thời trang nam",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=vi+da+nam+da+bo",
    tags: "ví da | bạn trai | người yêu | chồng | sinh nhật | nam | ví nam"
  },
  {
    name: "Thắt lưng da nam khóa tự động kim loại nguyên khối sang trọng",
    price: 290000,
    category: "Thời trang nam",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=that+lung+da+nam",
    tags: "thắt lưng | bạn trai | chồng | sinh nhật | phụ kiện nam"
  },
  {
    name: "Tai nghe Bluetooth không dây True Wireless chống ồn chủ động ANC pin 30h",
    price: 590000,
    category: "Thiết bị điện tử",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=tai+nghe+bluetooth+khong+day",
    tags: "tai nghe | tai nghe bluetooth | bạn trai | công nghệ | sinh nhật"
  },
  {
    name: "Đồng hồ nam dây thép không gỉ máy Quartz Nhật Bản mặt kính Sapphire",
    price: 850000,
    category: "Đồng hồ",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=dong+ho+nam+day+thep",
    tags: "đồng hồ | đồng hồ nam | bạn trai | người yêu | sinh nhật | kỷ niệm"
  },
  {
    name: "Bàn phím cơ không dây Bluetooth RGB 3 chế độ kết nối gõ êm mượt mà",
    price: 790000,
    category: "Thiết bị điện tử",
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=ban+phim+co+khong+day",
    tags: "bàn phím cơ | bạn trai | công nghệ | gaming | sinh nhật"
  },
  {
    name: "Máy cạo râu điện tử mini 3 lưỡi kép chống nước sạc Type-C tiện lợi",
    price: 320000,
    category: "Thiết bị điện tử",
    image: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=may+cao+rau+dien",
    tags: "máy cạo râu | bạn trai | chồng | thiết thực | sinh nhật | nam"
  },
  {
    name: "Bình giữ nhiệt Inox 316 hiển thị nhiệt độ thông minh 500ml giữ ấm 24h",
    price: 230000,
    category: "Nhà cửa & Đời sống",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=binh+giu+nhiet+inox+316",
    tags: "bình giữ nhiệt | bạn trai | bạn gái | văn phòng | sinh nhật"
  },
  {
    name: "Nước hoa nam Bleu hương gỗ trầm nam tính cuốn hút lưu hương 12h",
    price: 750000,
    category: "Mỹ phẩm & Làm đẹp",
    image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=nuoc+hoa+nam+bleu",
    tags: "nước hoa nam | bạn trai | người yêu | sinh nhật | nam tính"
  },

  // ==========================================
  // BỐ MẸ / GIA ĐÌNH / NGƯỜI LỚN TUỔI
  // ==========================================
  {
    name: "Bộ ấm chén gốm sứ Bát Tràng men rạn bọc đồng cổ điển sang trọng",
    price: 680000,
    category: "Nhà cửa & Đời sống",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=bo+am+chen+bat+trang",
    tags: "bộ ấm chén | bố mẹ | tặng mẹ | tặng bố | tân gia | sinh nhật bố mẹ"
  },
  {
    name: "Máy massage cổ vai gáy đa năng xung điện hồng ngoại thư giãn cột sống",
    price: 520000,
    category: "Sức khỏe & Làm đẹp",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=may+massage+co+vai+gay",
    tags: "máy massage | bố mẹ | sức khỏe | tặng mẹ | tặng bố | thư giãn"
  },
  {
    name: "Hộp trà hoa cúc hoàng gia sấy lạnh kèm táo đỏ kỷ tử bổ dưỡng an thần",
    price: 280000,
    category: "Thực phẩm & Đồ uống",
    image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=hop+tra+hoa+cuc+hoang+gia",
    tags: "trà thảo mộc | tặng mẹ | bố mẹ | sức khỏe | an thần | sinh nhật mẹ"
  },
  {
    name: "Khăn lụa tơ tằm vẽ tay hoa sen cao cấp mềm mịn quý phái",
    price: 490000,
    category: "Thời trang nữ",
    image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=khan+lua+to+tam",
    tags: "khăn lụa | tặng mẹ | cô giáo | 20/10 | 8/3 | sang trọng"
  },
  {
    name: "Nồi chiên không dầu điện tử dung tích lớn 6L nướng giòn không dầu mỡ",
    price: 1190000,
    category: "Thiết bị điện gia dụng",
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=noi+chien+khong+dau",
    tags: "nồi chiên không dầu | gia đình | tân gia | tặng mẹ | thiết thực"
  },

  // ==========================================
  // SẾP / ĐỒNG NGHIỆP / THẦY CÔ / BẠN BÈ
  // ==========================================
  {
    name: "Bút ký kim loại cao cấp khắc tên mạ vàng kèm hộp quà sang trọng",
    price: 350000,
    category: "Văn phòng phẩm",
    image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=but+ky+khac+ten+cao+cap",
    tags: "bút ký | sếp | đồng nghiệp | thầy cô | thăng chức | 20/11"
  },
  {
    name: "Sổ tay bìa da PU cao cấp cài bút kèm khóa số bảo mật thời thượng",
    price: 240000,
    category: "Văn phòng phẩm",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=so+tay+bia+da+cao+cap",
    tags: "sổ tay | đồng nghiệp | bạn bè | văn phòng | sinh nhật"
  },
  {
    name: "Chuột không dây công thái học chống mỏi cổ tay sạc pin Bluetooth siêu êm",
    price: 360000,
    category: "Thiết bị điện tử",
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=chuot+khong+day+cong+thai+hoc",
    tags: "chuột máy tính | công thái học | công nghệ | văn phòng | đồng nghiệp"
  },
  {
    name: "Đèn xông tinh dầu gốm sứ hoa văn cổ điển cắm điện thơm phòng khử mùi",
    price: 210000,
    category: "Nhà cửa & Đời sống",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=den+xong+tinh+dau+gom+su",
    tags: "đèn xông tinh dầu | tân gia | bạn bè | đồng nghiệp | thư giãn"
  },
  {
    name: "Bộ ly thủy tinh pha lê uống vang cao cấp 6 món viền mạ vàng",
    price: 580000,
    category: "Nhà cửa & Đời sống",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=bo+ly+thuy+tinh+pha+le",
    tags: "bộ ly | tân gia | sếp | quà tặng sang trọng | kỷ niệm"
  },

  // ==========================================
  // DỊP ĐẶC BIỆT: HALLOWEEN & GIÁNG SINH
  // ==========================================
  {
    name: "Đèn lồng bí ngô Halloween phát sáng LED có nhạc rùng rợn vui nhộn",
    price: 120000,
    category: "Đồ chơi & Lễ hội",
    image: "https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=den+bi+ngo+halloween",
    tags: "halloween | đèn bí ngô | phát sáng | quà độc lạ | lễ hội"
  },
  {
    name: "Quả cầu tuyết pha lê Giáng Sinh phát nhạc kèm đèn đổi màu lấp lánh",
    price: 280000,
    category: "Quà lưu niệm",
    image: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=qua+cau+tuyet+giang+sinh",
    tags: "giáng sinh | noel | quả cầu tuyết | người yêu | bạn gái | lãng mạn"
  },
  {
    name: "Khăn len quàng cổ caro ấm áp phong cách mùa đông Hàn Quốc",
    price: 190000,
    category: "Thời trang & Phụ kiện",
    image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=600&auto=format&fit=crop&q=80",
    url: "https://www.lazada.vn/catalog/?q=khan+len+quang+co",
    tags: "khăn len | mùa đông | giáng sinh | bạn gái | bạn trai | ấm áp"
  }
];

async function seed() {
  console.log("-> Bắt đầu nạp danh mục quà tặng hạt giống vào TiDB Cloud...");
  let added = 0;
  for (const item of SEED_PRODUCTS) {
    const key = `seed_${Buffer.from(item.name).toString("base64").substring(0, 40)}`;
    try {
      await pool.query(
        `INSERT INTO scraped_products 
         (product_key, platform, name, price, currency, image, url, condition_name, category, location, search_keyword, score, reason, created_at, updated_at)
         VALUES (?, 'lazada', ?, ?, 'VND', ?, ?, 'New', ?, 'Vietnam', ?, 90, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           price = VALUES(price),
           image = VALUES(image),
           url = VALUES(url),
           search_keyword = VALUES(search_keyword),
           updated_at = NOW()`,
        [
          key,
          item.name,
          item.price,
          item.image,
          item.url,
          item.category,
          item.tags,
          `Món quà tặng lý tưởng, được nhiều người yêu thích và lựa chọn.`
        ]
      );
      added++;
    } catch (err) {
      console.error("Lỗi nạp sản phẩm:", item.name, err.message);
    }
  }

  const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM scraped_products");
  console.log(`-> Thành công! Đã nạp xong ${added} sản phẩm. Tổng số sản phẩm trong CSDL TiDB: ${count}`);
  await pool.end();
}

if (require.main === module) {
  seed().catch(console.error);
}

module.exports = { seed, SEED_PRODUCTS };

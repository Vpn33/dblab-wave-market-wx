# dblab-wave-market-wx
dblab-wave-market 's wx miniprogram
高低频平衡 左侧高频更强 右侧低频更强 X = ((Frequency / 1000)^ 0.5) * 15 这里的15就是高低频平衡取值为1-16 x的最小值为1
hz:1000
最大 x:16 y:984
居中 x:9 y:991
最小 x:1 y:999

hz:109
最大 x:5 y:104
居中 x:2 y:107
最小 x:1 y:108

hz:10
最大 x:1 y:9
居中 x:1 y:9
最小 x:1 y:9


# 生成图像 反编译的代码 HomeActivity 5122-5149
 int[] arrayData = eventBusMsg.getArrayData();
this.f1979bM += 10;
ArrayList arrayList = new ArrayList();
for (int i = 0; i < 10; i++) {
	arrayList.add(new BarEntry((float) (this.f1979bM + i), (float) arrayData[i]));
}
this.f1978bL.addAll(arrayList);
if (this.f1978bL.size() > 300) {
	for (int i2 = 0; i2 < this.f1978bL.size() - 300; i2++) {
		this.f1978bL.remove(0);
	}
}
List<BarEntry> list = this.f1978bL;
StringBuilder sb = new StringBuilder();
sb.append(this.f1927aN == 1 ? "A" : "B");
sb.append(C0984a.m10302a(this, R.string.channel_wave));
C2637b bVar = new C2637b(list, sb.toString());
bVar.mo7159a(false);
bVar.m7243c(C0984a.m10303a(2131034424));
bVar.m7242d(C0984a.m10303a(2131034424));
bVar.m7244b(false);
C2636a aVar = new C2636a(bVar);
aVar.m7248a(1.0f);
this.f2026n.m7446a(1.0f, 1.0f, 0.0f, 0.0f);
this.f2026n.setData(aVar);
this.f2026n.getXAxis().m7389a(this.f1978bL.get(0).mo7250i());
this.f2026n.invalidate();
this.f2026n.mo7413b(0.0f, 300.0f);

# 计算图像数据
    private int[] m10527a(int i, int i2, int i3) {
        for (int i4 = 0; i4 < 100; i4++) {
            if ((this.f647w < i) && (this.f648x == 0)) {
                this.f649y[i4] = 1;
                this.f647w++;
            } else {
                this.f647w = 0;
                if (this.f648x < i2) {
                    this.f649y[i4] = 0;
                    this.f648x++;
                } else {
                    if (i == 0) {
                        this.f649y[i4] = 0;
                    } else {
                        this.f649y[i4] = 1;
                    }
                    this.f647w = 1;
                    this.f648x = 0;
                }
            }
        }
        for (int i5 = 0; i5 < 10; i5++) {
            int i6 = i5 * 10;
            if (this.f649y[i6] == 0 && this.f649y[i6 + 1] == 0 && this.f649y[i6 + 2] == 0 && this.f649y[i6 + 3] == 0 && this.f649y[i6 + 4] == 0 && this.f649y[i6 + 5] == 0 && this.f649y[i6 + 6] == 0 && this.f649y[i6 + 7] == 0 && this.f649y[i6 + 8] == 0 && this.f649y[i6 + 9] == 0) {
                this.f650z[i5] = 0;
            } else {
                this.f650z[i5] = this.f620A + (((i3 - this.f620A) * (i5 + 1)) / 10);
            }
        }
        this.f620A = i3;
        return this.f650z;
    }


private int[] m10527a(int i, int i2, int i3) {
        for (int i4 = 0; i4 < 100; i4++) {
            if ((this.f647w < i) && (this.f648x == 0)) {
                this.f649y[i4] = 1;
                this.f647w++;
            } else {
                this.f647w = 0;
                if (this.f648x < i2) {
                    this.f649y[i4] = 0;
                    this.f648x++;
                } else {
                    if (i == 0) {
                        this.f649y[i4] = 0;
                    } else {
                        this.f649y[i4] = 1;
                    }
                    this.f647w = 1;
                    this.f648x = 0;
                }
            }
        }
        for (int i5 = 0; i5 < 10; i5++) {
            int i6 = i5 * 10;
            if (this.f649y[i6] == 0 && this.f649y[i6 + 1] == 0 && this.f649y[i6 + 2] == 0 && this.f649y[i6 + 3] == 0 && this.f649y[i6 + 4] == 0 && this.f649y[i6 + 5] == 0 && this.f649y[i6 + 6] == 0 && this.f649y[i6 + 7] == 0 && this.f649y[i6 + 8] == 0 && this.f649y[i6 + 9] == 0) {
                this.f650z[i5] = 0;
            } else {
                this.f650z[i5] = this.f620A + (((i3 - this.f620A) * (i5 + 1)) / 10);
            }
        }
        this.f620A = i3;
        return this.f650z;
    }
-----------------------------
public void setAxisMinimum(float min) {
        mCustomAxisMin = true;
        mAxisMinimum = min;
        this.mAxisRange = Math.abs(mAxisMaximum - min);
    }
public void m7389a(float f) {
        this.f4359r = true;
        this.f4362u = f;
        this.f4363v = Math.abs(this.f4361t - f);
    }
-------------------------
    public void setAxisMaximum(float max) {
        mCustomAxisMax = true;
        mAxisMaximum = max;
        this.mAxisRange = Math.abs(max - mAxisMinimum);
    }
    /* renamed from: c */
    public void m7381c(float f) {
        this.f4360s = true;
        this.f4361t = f;
        this.f4363v = Math.abs(f - this.f4362u);
    }
--------------------------------------
根据hz计算滑块hz的值
parseInt(Math.pow(10, ((65 * 20) + 1000) / 1000))
----------------------------

----------------------------
呼吸
"000000000000000100100001",
"000000100000000100100001",
"000001000000000100100001",
"000001100000000100100001",
"000010000000000100100001",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001"
[{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":4},{"x":1,"y":9,"z":8},{"x":1,"y":9,"z":12},{"x":1,"y":9,"z":16},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20}]
----------------------------

----------------------------
连击
"000010100000000100100001",
"000000000000000100100001",
"000010100000000100100001",
"000001101000000100100001",
"000000110000000100100001",
"000000000000000100100001",
"000000000000000100100001",
"000000000000000100100001"
[{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":13},{"x":1,"y":9,"z":6},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0}]
----------------------------
----------------------------
按捏渐强
"000000000000000100100001",
"000000101000000100100001",
"000000000000000100100001",
"000001010000000100100001",
"000000000000000100100001",
"000001110000000100100001",
"000000000000000100100001",
"000010001000000100100001",
"000000000000000100100001",
"000010100000000100100001",
"000000000000000100100001"
[{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":5},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":10},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":14},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":17},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0}]
----------------------------
----------------------------
心跳节奏 第一小节 频率65
"000010100001100000000111",
"000010100001100000000111",
"000000000000000100100001",
"000000000000000100100001",
"000000000000000100100001",
"000000000000000100100001",
"000000000000000100100001",
"000001110000000100100001",
"000010000000000100100001",
"000010010000000100100001",
"000010100000000100100001",
"000000000000000100100001",
"000000000000000100100001",
"000000000000000100100001",
"000000000000000100100001",
"000000000000000100100001",
[{"x":7,"y":192,"z":20},{"x":7,"y":192,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":14},{"x":1,"y":9,"z":16},{"x":1,"y":9,"z":18},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":0}]
----------------------------
----------------------------
压缩 第一小节 节内渐变[52 ,16]
"000010100000110100000101",
"000010100000101100000100",
"000010100000100101000100",
"000010100000011111000100",
"000010100000011010100011",
"000010100000010110000011",
"000010100000010010100011",
"000010100000010000000010",
"000010100000001101100010",
"000010100000001011000010",
"000010100000001001000010",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001",
"000010100000000100100001"
[{"x":5,"y":104,"z":20},{"x":4,"y":88,"z":20},{"x":4,"y":74,"z":20},{"x":4,"y":62,"z":20},{"x":3,"y":53,"z":20},{"x":3,"y":44,"z":20},{"x":3,"y":37,"z":20},{"x":2,"y":32,"z":20},{"x":2,"y":27,"z":20},{"x":2,"y":22,"z":20},{"x":2,"y":18,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":20}]
----------------------------

---------------------------
节奏步伐
"000000000000000100100001",
"000000100000000100100001",
"000001000000000100100001",
"000001100000000100100001",
"000010000000000100100001",
"000010100000000100100001",
"000000000000000100100001",
"000000101000000100100001",
"000001010000000100100001",
"000001111000000100100001",
"000010100000000100100001",
"000000000000000100100001",
"000000110000000100100001",
"000001101000000100100001",
"000010100000000100100001",
"000000000000000100100001",
"000001010000000100100001",
"000010100000000100100001",
"000000000000000100100001",
"000010100000000100100001",
"000000000000000100100001",
"000010100000000100100001",
"000000000000000100100001",
"000010100000000100100001",
"000000000000000100100001",
"000010100000000100100001",
[{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":4},{"x":1,"y":9,"z":8},{"x":1,"y":9,"z":12},{"x":1,"y":9,"z":16},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":5},{"x":1,"y":9,"z":10},{"x":1,"y":9,"z":15},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":6},{"x":1,"y":9,"z":13},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":10},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":20}]
---------------------------

---------------------------
颗粒摩擦 节内渐变 [1, 37]
"000010100000000100100001",
"000010100000000101100001",
"000010100000000110100001",
"000000000000001000000001",
"000010100000001000000001",
"000010100000001010000001",
"000010100000001100100001",
"000000000000001111100001",
"000010100000001111100001",
"000010100000010010100001",
"000010100000010111000001",
"000000000000011100000001"
[{"x":1,"y":9,"z":20},{"x":1,"y":11,"z":20},{"x":1,"y":13,"z":20},{"x":1,"y":16,"z":0},{"x":1,"y":16,"z":20},{"x":1,"y":20,"z":20},{"x":1,"y":25,"z":20},{"x":1,"y":31,"z":0},{"x":1,"y":31,"z":20},{"x":1,"y":37,"z":20},{"x":1,"y":46,"z":20},{"x":1,"y":56,"z":0}]
---------------------------

---------------------------
渐变弹跳 节内渐变[1, 30]
"000000000000000100100001",
"000000110000000100100001",
"000001101000000101000001",
"000010100000000101000001",
"000000000000000101000001",
"000000110000000101100001",
"000001101000000110000001",
"000010100000000110100001",
"000000000000000110100001",
"000000110000000110100001",
"000001101000000111000001",
"000010100000000111000010",
"000000000000000111000010",
"000000110000000111100010",
"000001101000001000000010",
"000010100000001000100010",
"000000000000001000100010",
"000000110000001001100010",
"000001101000001010000010",
"000010100000001010100010",
"000000000000001010100010",
"000000110000001011100010",
"000001101000001100000010",
"000010100000001101000010",
"000000000000001101000010",
"000000110000001101100010",
"000001101000001110100010",
"000010100000001111100010",
"000000000000001111100010",
"000000110000010000100010",
"000001101000010001000011",
"000010100000010010000011"
[{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":6},{"x":1,"y":10,"z":13},{"x":1,"y":10,"z":20},{"x":1,"y":10,"z":0},{"x":1,"y":11,"z":6},{"x":1,"y":12,"z":13},{"x":1,"y":13,"z":20},{"x":1,"y":13,"z":0},{"x":1,"y":13,"z":6},{"x":1,"y":14,"z":13},{"x":2,"y":14,"z":20},{"x":2,"y":14,"z":0},{"x":2,"y":15,"z":6},{"x":2,"y":16,"z":13},{"x":2,"y":17,"z":20},{"x":2,"y":17,"z":0},{"x":2,"y":19,"z":6},{"x":2,"y":20,"z":13},{"x":2,"y":21,"z":20},{"x":2,"y":21,"z":0},{"x":2,"y":23,"z":6},{"x":2,"y":24,"z":13},{"x":2,"y":26,"z":20},{"x":2,"y":26,"z":0},{"x":2,"y":27,"z":6},{"x":2,"y":29,"z":13},{"x":2,"y":31,"z":20},{"x":2,"y":31,"z":0},{"x":2,"y":33,"z":6},{"x":3,"y":34,"z":13},{"x":3,"y":36,"z":20}]
---------------------------

---------------------------
波浪涟漪 元内渐变[1, 60]
"000000000000000100100001",
"000001010000000100100001",
"000010100000000100100001",
"000001110000000100100001",
"000000000000000110000001",
"000001010000000110000001",
"000010100000000110000001",
"000001110000000110000001",
"000000000000001000000010",
"000001010000001000000010",
"000010100000001000000010",
"000001110000001000000010",
"000000000000001011100010",
"000001010000001011100010",
"000010100000001011100010",
"000001110000001011100010",
"000000000000010000000010",
"000001010000010000000010",
"000010100000010000000010",
"000001110000010000000010",
"000000000000010101100011",
"000001010000010101100011",
"000010100000010101100011",
"000001110000010101100011",
"000000000000011101100100",
"000001010000011101100100",
"000010100000011101100100",
"000001110000011101100100",
"000000000000101000100100",
"000001010000101000100100",
"000010100000101000100100",
"000001110000101000100100",
"000000000000110111100101",
"000001010000110111100101",
"000010100000110111100101",
"000001110000110111100101",
"000000000001001100000110",
"000001010001001100000110",
"000010100001001100000110",
"000001110001001100000110"
[{"x":1,"y":9,"z":0},{"x":1,"y":9,"z":10},{"x":1,"y":9,"z":20},{"x":1,"y":9,"z":14},{"x":1,"y":12,"z":0},{"x":1,"y":12,"z":10},{"x":1,"y":12,"z":20},{"x":1,"y":12,"z":14},{"x":2,"y":16,"z":0},{"x":2,"y":16,"z":10},{"x":2,"y":16,"z":20},{"x":2,"y":16,"z":14},{"x":2,"y":23,"z":0},{"x":2,"y":23,"z":10},{"x":2,"y":23,"z":20},{"x":2,"y":23,"z":14},{"x":2,"y":32,"z":0},{"x":2,"y":32,"z":10},{"x":2,"y":32,"z":20},{"x":2,"y":32,"z":14},{"x":3,"y":43,"z":0},{"x":3,"y":43,"z":10},{"x":3,"y":43,"z":20},{"x":3,"y":43,"z":14},{"x":4,"y":59,"z":0},{"x":4,"y":59,"z":10},{"x":4,"y":59,"z":20},{"x":4,"y":59,"z":14},{"x":4,"y":81,"z":0},{"x":4,"y":81,"z":10},{"x":4,"y":81,"z":20},{"x":4,"y":81,"z":14},{"x":5,"y":111,"z":0},{"x":5,"y":111,"z":10},{"x":5,"y":111,"z":20},{"x":5,"y":111,"z":14},{"x":6,"y":152,"z":0},{"x":6,"y":152,"z":10},{"x":6,"y":152,"z":20},{"x":6,"y":152,"z":14}]
---------------------------

----------------------------
雨水冲刷 第一小节频率4 第二小节44
"000000110000000101100001",
"000001101000000101100001",
"000010100000000101100001",
"000000110000000101100001",
"000001101000000101100001",
"000010100000000101100001",
"000000110000000101100001",
"000001101000000101100001",
"000010100000000101100001",
"000000110000000101100001",
"000001101000000101100001",
"000010100000000101100001",
"000000110000000101100001",
"000001101000000101100001",
"000010100000000101100001",
"000000110000000101100001",
"000001101000000101100001",
"000010100000000101100001",
"000000110000000101100001",
"000001101000000101100001",
"000010100000000101100001",
"000000110000000101100001",
"000001101000000101100001",
"000010100000000101100001",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010",
"000010100000100100100010"
[{"x":1,"y":11,"z":6},{"x":1,"y":11,"z":13},{"x":1,"y":11,"z":20},{"x":1,"y":11,"z":6},{"x":1,"y":11,"z":13},{"x":1,"y":11,"z":20},{"x":1,"y":11,"z":6},{"x":1,"y":11,"z":13},{"x":1,"y":11,"z":20},{"x":1,"y":11,"z":6},{"x":1,"y":11,"z":13},{"x":1,"y":11,"z":20},{"x":1,"y":11,"z":6},{"x":1,"y":11,"z":13},{"x":1,"y":11,"z":20},{"x":1,"y":11,"z":6},{"x":1,"y":11,"z":13},{"x":1,"y":11,"z":20},{"x":1,"y":11,"z":6},{"x":1,"y":11,"z":13},{"x":1,"y":11,"z":20},{"x":1,"y":11,"z":6},{"x":1,"y":11,"z":13},{"x":1,"y":11,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20},{"x":2,"y":73,"z":20}]
----------------------------
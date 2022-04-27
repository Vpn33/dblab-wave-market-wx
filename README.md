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

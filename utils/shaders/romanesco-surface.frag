#version 300 es
precision highp float;
precision highp int;
// bool traceNearest( -- standalone surface prototype hook marker.
uniform highp sampler2D u_roots;
uniform int u_rootCount;
uniform vec2 u_resolution,u_projection,u_origin;
uniform vec3 u_right,u_up,u_forward,u_fill,u_stroke,u_background;
uniform float u_focal,u_pixelAngle,u_nearFootprint,u_detailScale,u_far;
uniform float u_maxRank,u_growth,u_lineWidth,u_fogScale,u_reliefFront;
uniform bool u_faces,u_wire;
uniform int u_lighting,u_query;
uniform int u_iterationLimit;uniform bool u_traceResume;uniform highp sampler2D u_traceState;
uniform vec3 u_queryRay;
layout(location=0) out vec4 outColor;
layout(location=1) out vec4 outSurface;
layout(location=2) out vec4 outTrace;
const float PI=3.14159265358979323846,TAU=6.28318530717958647692;
const float BETA=0.3819660112501051518,DECAY=0.015;
const float LATTICE_A=0.03444185374863303,LATTICE_B=0.05572809000084122;
const vec2 BASIS_A=vec2(-8.0*DECAY,TAU*LATTICE_B),BASIS_B=vec2(-13.0*DECAY,-TAU*LATTICE_A);
// Half the smaller altitude of the physical log-polar parallelogram.
const float CELL_RADIUS=0.12730;
const float PATCH_EPS=0.06,RIM_WIDTH=0.25;
const float HEX_COVER=0.5773502691896258;
const float BASE_RADIUS=0.86,RELIEF_HEIGHT=0.13,BASE_DEPTH=0.28;
const float SIDE_LIPSCHITZ=2.75,BOTTOM_LIPSCHITZ=2.0;
const int RELIEF_LEVELS=64,MARCH_STEPS=8192;
int fieldEvaluations=0;bool reliefBracketUsed=false;
struct Root {vec3 center;mat3 axes;float size;};
Root readRoot(){
 vec4 first=texelFetch(u_roots,ivec2(1,0),0),second=texelFetch(u_roots,ivec2(2,0),0);
 return Root(texelFetch(u_roots,ivec2(0,0),0).xyz,mat3(first.xyz,second.xyz,texelFetch(u_roots,ivec2(3,0),0).xyz),second.w);
}
vec3 rootInverse(Root t,vec3 p){return transpose(t.axes)*p/(t.size*t.size);}
// The same golden-angle centers now tile the carrier without empty gaps.
// Cube rounding chooses the nearest center of a regular triangular lattice.
vec2 spiralCell(float radius,float angle){
 float u=-log(max(radius,1e-30))/DECAY,v=angle/TAU;
 vec2 address=vec2(LATTICE_A*u+13.0*v,LATTICE_B*u-8.0*v);
 vec3 cube=vec3(address.x,-address.y,-address.x+address.y),rounded=floor(cube+0.5);
 vec3 error=abs(rounded-cube);
 if(error.x>error.y&&error.x>error.z)rounded.x=-rounded.y-rounded.z;
 else if(error.y>error.z)rounded.y=-rounded.x-rounded.z;
 else rounded.z=-rounded.x-rounded.y;
 vec2 local=address-vec2(rounded.x,-rounded.y);
 return vec2(local.x-0.5*local.y,0.8660254037844386*local.y)/HEX_COVER;
}
float hexRim(vec2 q){
 vec2 p=q*HEX_COVER;
 float support=max(abs(p.x),max(abs(dot(p,vec2(.5,.8660254037844386))),abs(dot(p,vec2(-.5,.8660254037844386)))));
 return clamp((.5-support)/RIM_WIDTH,0.0,1.0);
}
// The primary conical height agrees across each nearest-center cell edge.
// Only the nested tail vanishes there. No flat gaps surround the heads.
// H lies in[0,1]; the hex reliefSample has L<1.878 with epsilon=.06.
float patchHeight(vec2 p,float amplitude,float pixel,int firstRank){
 float value=0.0,weight=1.0;
 for(int level=0;level<RELIEF_LEVELS;level++){
  float rank=float(firstRank+level);if(rank>u_maxRank)break;
  float radius=min(1.0,length(p));
  float growth=rank>0.0&&rank==u_maxRank?u_growth:1.0;
  value+=weight*(1.0-radius)*growth;
  weight*=PATCH_EPS*radius*hexRim(p);
  // Any smaller addition is below half a Float32 ulp of this height. Deep
  // reference coordinates evaluate the small differences separately.
  if(radius<=1e-30||weight*amplitude<=pixel*.03125||(value>0.0&&weight<value*1e-8))break;
  p=spiralCell(radius,atan(p.y,p.x));
 }
 return value;
}
// The underside begins with a circular carrier, whose height vanishes on its
// scalloped footprint boundary. Every smaller reliefSample uses the filled hex field.
float diskHeight(vec2 p,float amplitude,float pixel){
 float radius=length(p);if(radius>=1.0)return 0.0;
 float base=1.0-radius;
 if(u_maxRank<1.0||radius<=1e-30)return base;
 float weight=PATCH_EPS*radius*min(1.0,(1.0-radius)/RIM_WIDTH);
 if(weight*amplitude<=pixel*.03125)return base;
 return base+weight*patchHeight(spiralCell(radius,atan(p.y,p.x)),amplitude*weight,pixel,1);
}
// Shear only the primary chart. Within the surface band this tilts heads
// upward; clamping the off-surface extension preserves its zeros and bounds.
// Return chart height and its radial/height derivatives.
vec3 primaryChart(float h,float radial){
 if(h<=0.0)return vec3(0.0,0.0,1.0);
 if(h>=1.0)return vec3(h,0.0,1.0);
 float h3=h*h*h,c=.63*(1.0-h3*h),cp=-2.52*h3;
 float delta=radial-BASE_RADIUS*h;
 if(delta<=0.0)return vec3(h,0.0,1.0);
 if(delta>=RELIEF_HEIGHT*h)return vec3(h+c*RELIEF_HEIGHT*h,0.0,1.0+RELIEF_HEIGHT*(c+h*cp));
 return vec3(h+c*delta,c,1.0-BASE_RADIUS*c+cp*delta);
}
float ringRadius(float angle,float pixel){
 if(u_maxRank<1.0)return BASE_RADIUS;
 return BASE_RADIUS+RELIEF_HEIGHT*patchHeight(spiralCell(1.0,angle),RELIEF_HEIGHT,pixel,1);
}
// Both inequalities are globally Lipschitz, including the polar axis.
// Their maximum divided by the proved constants is a safe distance bound.
float reliefField(vec3 p,float pixel){
 fieldEvaluations++;
 float radial=length(p.xz),angle=radial>1e-30?atan(p.z,p.x):0.0;
 float h=max(0.0,(1.0-p.y)*0.5);
 float amplitude=RELIEF_HEIGHT*min(h,radial/BASE_RADIUS);
 float top=0.0;
 if(u_maxRank>=1.0&&amplitude>pixel*0.03125)top=patchHeight(spiralCell(primaryChart(h,radial).x,angle),amplitude,pixel,1);
 float side=(radial-BASE_RADIUS*h-amplitude*top)/SIDE_LIPSCHITZ;
 float bottom;
 // The actual underside is below y=-1. When already outside the side,
 // it cannot change either the solid sign or the conservative side step.
 if(p.y>=-1.0&&side>=0.0)bottom=-1.0;
 else {
  float ring=ringRadius(angle,pixel);
  float depth=diskHeight(p.xz/ring,BASE_DEPTH,pixel);
  bottom=(-1.0-BASE_DEPTH*depth-p.y)/BOTTOM_LIPSCHITZ;
 }
 return max(p.y-1.0,max(side,bottom));
}
// ROMANESCO_CHART

bool quadratic(float a,float b,float c,out vec2 roots){
 if(abs(a)<1e-20){if(abs(b)<1e-20)return false;roots=vec2(-c/b);return true;}
 float disc=b*b-4.0*a*c;if(disc<0.0)return false;
 float q=-0.5*(b+(b>=0.0?1.0:-1.0)*sqrt(max(0.0,disc)));
 if(abs(q)<1e-30)roots=vec2(-b/(2.0*a));
 else {roots=vec2(q/a,c/q);if(roots.x>roots.y)roots=roots.yx;}return true;
}
// A cone, cylinder and base bound the entire new surface. No child list.
bool outerInterval(vec3 origin,vec3 d,float limit,out float nearAt,out float farAt){
 const float k=(BASE_RADIUS+RELIEF_HEIGHT)*0.5;
 float error=0.0000005*max(1.0,max(abs(origin.x),max(abs(origin.y),abs(origin.z))));
 float tip=1.0+error/k,base=-1.0-BASE_DEPTH-error;
 float shift=dot(vec3(0.0,tip,0.0)-origin,d)/dot(d,d);vec3 o=origin+shift*d;
 float enter=-1e30,leave=limit-shift;
 if(abs(d.y)<1e-20){if(o.y<base||o.y>tip)return false;}
 else {float a=(base-o.y)/d.y,b=(tip-o.y)/d.y;enter=min(a,b);leave=min(leave,max(a,b));}
 float k2=k*k,a=dot(d.xz,d.xz)-k2*d.y*d.y;
 float b=2.0*(dot(o.xz,d.xz)+k2*(tip-o.y)*d.y),c=dot(o.xz,o.xz)-k2*(tip-o.y)*(tip-o.y);vec2 roots;
 if(abs(a)<1e-20){if(abs(b)<1e-20){if(c>0.0)return false;}else if(b>0.0)leave=min(leave,-c/b);else enter=max(enter,-c/b);}
 else if(quadratic(a,b,c,roots)){if(a>0.0){enter=max(enter,roots.x);leave=min(leave,roots.y);}else if(d.y>0.0)leave=min(leave,roots.x);else enter=max(enter,roots.y);}
 else if(a>0.0)return false;
 float radius=BASE_RADIUS+RELIEF_HEIGHT+error,speed=dot(d.xz,d.xz);
 if(speed<1e-30){if(dot(o.xz,o.xz)>radius*radius)return false;}
 else {float middle=-dot(o.xz,d.xz)/speed;vec2 closest=o.xz+middle*d.xz;float gap=radius*radius-dot(closest,closest);if(gap<0.0)return false;float span=sqrt(max(0.0,gap)/speed);enter=max(enter,middle-span);leave=min(leave,middle+span);}
 nearAt=max(0.0,enter+shift);farAt=leave+shift;return farAt>=nearAt;
}
vec4 encodeDistance(float distance,bool hit){uint bits=floatBitsToUint(hit?distance:-1.0);return vec4(float(bits&255u),float((bits>>8u)&255u),float((bits>>16u)&255u),float((bits>>24u)&255u))/255.0;}
float localPixel(float t,float scale){return max(u_nearFootprint,t*u_pixelAngle)/scale;}
// The bare cone above y=-1 is a guaranteed subset of the new solid.
bool innerConeEntry(vec3 origin,vec3 d,float limit,out float nearAt){
 const float k=BASE_RADIUS*.5;float shift=dot(vec3(0.0,1.0,0.0)-origin,d)/dot(d,d);vec3 o=origin+shift*d;
 float enter=-1e30,leave=limit-shift;
 if(abs(d.y)<1e-20){if(o.y<-1.0||o.y>1.0)return false;}
 else {float a=(-1.0-o.y)/d.y,b=(1.0-o.y)/d.y;enter=min(a,b);leave=min(leave,max(a,b));}
 float k2=k*k,a=dot(d.xz,d.xz)-k2*d.y*d.y;
 float b=2.0*(dot(o.xz,d.xz)+k2*(1.0-o.y)*d.y),c=dot(o.xz,o.xz)-k2*(1.0-o.y)*(1.0-o.y);vec2 roots;
 if(abs(a)<1e-20){if(abs(b)<1e-20){if(c>0.0)return false;}else if(b>0.0)leave=min(leave,-c/b);else enter=max(enter,-c/b);}
 else if(quadratic(a,b,c,roots)){if(a>0.0){enter=max(enter,roots.x);leave=min(leave,roots.y);}else if(d.y>0.0)leave=min(leave,roots.x);else enter=max(enter,roots.y);}
 else if(a>0.0)return false;
 nearAt=max(0.0,enter+shift);return leave+shift>=nearAt&&nearAt<=limit;
}
float sideValue(vec3 p,float pixel){
 fieldEvaluations++;
 float r=length(p.xz),h=max(0.0,(1.0-p.y)*.5),amplitude=RELIEF_HEIGHT*min(h,r/BASE_RADIUS),height=0.0;
 if(u_maxRank>=1.0&&amplitude>pixel*.03125)height=patchHeight(spiralCell(primaryChart(h,r).x,atan(p.z,p.x)),amplitude,pixel,1);
 return r-BASE_RADIUS*h-amplitude*height;
}
// Truncation only removes positive relief. Most sign queries need the cheap
// pixel-tail evaluator; only an ambiguous small positive value needs all levels.
float certifiedSideSign(vec3 p,float pixel){
 float value=sideValue(p,pixel);
 if(value>=0.0&&value<=pixel*.03125)value=sideValue(p,0.0);
 return value;
}
bool monotoneSideBracket(vec3 o,vec3 d,float begin,float end,out float lo,out float hi,out float decrease){
 decrease=0.0;lo=begin;if(!innerConeEntry(o,d,end,hi)||hi<=lo)return false;
 vec3 p0=o+lo*d,p1=o+hi*d;
 if(min(p0.y,p1.y)<=-.99998||max(p0.y,p1.y)>=.99998)return false;
 float h0=(1.0-p0.y)*.5,h1=(1.0-p1.y)*.5,hmin=min(h0,h1),hmax=max(h0,h1),dh=-d.y*.5;
 float span=hi-lo,speed=dot(d.xz,d.xz),closest=speed>1e-25?clamp(-dot(p0.xz,d.xz)/speed,0.0,span):0.0;
 float rmin=length(p0.xz+closest*d.xz),rmax=max(length(p0.xz),length(p1.xz));
 float guard=0.00002*(1.0+max(length(p0),length(p1)));
 if(rmin<=guard||hmin<=guard)return false;
 rmin-=guard;rmax+=guard;hmin=max(0.0,hmin-guard);hmax+=guard;
 float angular=p0.x*d.z-p0.z*d.x;
 float z0=angular*hmin/(rmax*rmax),z1=angular*hmax/(rmin*rmin);
 float zlo=min(z0,z1),zhi=max(z0,z1),zGuard=.00002*(1.0+abs(zlo)+abs(zhi));zlo-=zGuard;zhi+=zGuard;
 // Exact directional derivative columns for the physical120-degree cell map.
 const vec2 m0=vec2(-.7595399299,-5.5728090001),m1=vec2(4.6862956114,-1.9098593171);
 float radialStart=dot(p0.xz,d.xz)/max(length(p0.xz),1e-20),radialDerivative=dot(p1.xz,d.xz)/max(length(p1.xz),1e-20);
 float lowH=clamp(hmin,0.0,1.0),highH=clamp(hmax,0.0,1.0);
 float lowH4=lowH*lowH*lowH*lowH,highH4=highH*highH*highH*highH;
 float cmin=.63*(1.0-highH4),cmax=.63*(1.0-lowH4);
 float shmin=1.0-BASE_RADIUS*.63+.63*(BASE_RADIUS-4.0*RELIEF_HEIGHT)*lowH4;
 float shmax=1.0-BASE_RADIUS*.63+BASE_RADIUS*.63*highH4;
 vec4 radialTerms=vec4(cmin*radialStart,cmin*radialDerivative,cmax*radialStart,cmax*radialDerivative);
 float sprimeLo=min(shmin*dh,shmax*dh)+min(min(radialTerms.x,radialTerms.y),min(radialTerms.z,radialTerms.w));
 float sprimeHi=max(shmin*dh,shmax*dh)+max(max(radialTerms.x,radialTerms.y),max(radialTerms.z,radialTerms.w));
 float ratioLo=1.0/(1.0+cmax*RELIEF_HEIGHT);
 float qlo=min(sprimeLo,ratioLo*sprimeLo),qhi=max(sprimeHi,ratioLo*sprimeHi);
 float foldSpeed=max(max(length(m0*qlo+m1*zlo),length(m0*qlo+m1*zhi)),max(length(m0*qhi+m1*zlo),length(m0*qhi+m1*zhi)));
 float upper=radialDerivative-BASE_RADIUS*dh+RELIEF_HEIGHT*max(0.0,-dh)+RELIEF_HEIGHT*1.878*foldSpeed;
 float derivativeGuard=.0001*(1.0+length(d));
 decrease=-upper-derivativeGuard;return decrease>0.0;
}
vec3 reliefNormal(vec3 p,float pixel,Root root){
 float e=max(2e-7,pixel*.35),normalPixel=pixel*.125;
 vec3 n=vec3(reliefField(p+vec3(e,0,0),normalPixel)-reliefField(p-vec3(e,0,0),normalPixel),
             reliefField(p+vec3(0,e,0),normalPixel)-reliefField(p-vec3(0,e,0),normalPixel),
             reliefField(p+vec3(0,0,e),normalPixel)-reliefField(p-vec3(0,0,e),normalPixel));
 return normalize(root.axes*n);
}
bool traceRelief(vec3 ray,Root root,float restart,out float hit,out vec3 normal,out bool complete){
 vec3 o=rootInverse(root,-root.center),d=rootInverse(root,ray);
 float begin,end;hit=u_far;normal=vec3(0.0);complete=true;
 if(!outerInterval(o,d,u_far,begin,end))return false;
 begin=max(begin,restart);
 float bracketLow,bracketHigh,decrease;
 if(restart==0.0&&monotoneSideBracket(o,d,begin,end,bracketLow,bracketHigh,decrease)){
  float pixel=max(1e-8,localPixel(bracketLow,root.size));
  float left=certifiedSideSign(o+bracketLow*d,pixel*.125),right=certifiedSideSign(o+bracketHigh*d,pixel*.125);
  if(left>=0.0&&right<=0.0){
   float tolerance=.2*pixel*root.size;
   for(int refine=0;refine<24;refine++){
    if(bracketHigh-bracketLow<=tolerance)break;
    float middle=(bracketLow+bracketHigh)*.5;
    float value=certifiedSideSign(o+middle*d,pixel*.125);
    if(value>0.0)bracketLow=middle;else bracketHigh=middle;
   }
   if(bracketHigh-bracketLow<=tolerance){
    hit=(bracketLow+bracketHigh)*.5;normal=reliefNormal(o+hit*d,pixel,root);reliefBracketUsed=true;return true;
   }
  }
 }
 float t=begin,trustedT=begin,trustedValue=0.0,trustedRadius=0.0;
 bool haveTrusted=false,relaxedTrial=false;
 for(int step=0;step<MARCH_STEPS;step++){
  if(u_iterationLimit>0&&step>=u_iterationLimit)break;
  float pixel=max(1e-8,localPixel(t,root.size));
  float value=reliefField(o+t*d,pixel);
  if(isnan(value)||isinf(value)){hit=trustedT;complete=false;return false;}
  // Removing every unresolved positive tail changes this field by at most
  // .02539 local pixels, including the matching-ring effect on the underside.
  float radius=max(0.0,abs(value)-.026*pixel)*root.size*.98;
  if(relaxedTrial){
   float traveled=t-trustedT;
   float guard=16.0*.000000059604644775390625*(1.0+abs(t)+abs(trustedT));
   bool sameSide=value*trustedValue>0.0;
   if(!sameSide||trustedRadius+radius<=traveled+guard){
    t=trustedT+trustedRadius;relaxedTrial=false;
    if(t<=trustedT){hit=trustedT;complete=false;return false;}
    continue;
   }
   relaxedTrial=false;
  }
  // Over-relaxed trials must pass the empty-ball overlap check before a hit,
  // sign bracket or miss at the enclosing interval end can be accepted.
  bool crossing=haveTrusted&&value*trustedValue<0.0;
  if(crossing){
   float lo=trustedT,hi=t,loValue=trustedValue;
   for(int refine=0;refine<10;refine++){
    float middle=(lo+hi)*.5,middleValue=reliefField(o+middle*d,pixel*.25);
    if(middleValue*loValue>0.0){lo=middle;loValue=middleValue;}else hi=middle;
   }
   t=(lo+hi)*.5;
  }
  if(crossing||abs(value)<=pixel*.04){
   hit=t;normal=reliefNormal(o+t*d,pixel,root);return true;
  }
  if(t>=end||t+radius>end)return false;
  trustedT=t;trustedValue=value;trustedRadius=radius;haveTrusted=true;
  t=min(end,trustedT+1.5*trustedRadius);relaxedTrial=true;
  if(t<=trustedT){hit=trustedT;complete=false;return false;}
 }
 hit=trustedT;complete=false;return false;
}
vec3 chartNormal(vec3 p,float pixel){
 float e=max(2e-7,pixel*.35),normalPixel=pixel*.125;
 return normalize(vec3(
  romanescoChartRawField(p+vec3(e,0,0),normalPixel)-romanescoChartRawField(p-vec3(e,0,0),normalPixel),
  romanescoChartRawField(p+vec3(0,e,0),normalPixel)-romanescoChartRawField(p-vec3(0,e,0),normalPixel),
  romanescoChartRawField(p+vec3(0,0,e),normalPixel)-romanescoChartRawField(p-vec3(0,0,e),normalPixel)));
}
bool traceChart(vec3 ray,float restart,out float hit,out vec3 normal,out bool complete){
 hit=u_far;normal=vec3(0);complete=true;
 if(u_chartMode==1){
  float derivative=dot(u_chartPlane.yzw,ray);
  if(abs(derivative)<1e-20)return false;
  hit=-u_chartPlane.x/derivative;
  normal=normalize(u_chartPlane.yzw);
  return hit>=0.0&&hit<=u_far;
 }
 float t=restart;
 for(int step=0;step<MARCH_STEPS;step++){
  if(u_iterationLimit>0&&step>=u_iterationLimit)break;
  float pixel=max(u_nearFootprint,t*u_pixelAngle);
  float raw=romanescoChartRawField(ray*t,pixel);
  if(u_chartMode==5&&!residualReliable){hit=t;complete=false;return false;}
  float error=romanescoChartFieldError(pixel);
  if(isnan(raw)||isinf(raw)){hit=t;complete=false;return false;}
  if(abs(raw)<=error+.04*pixel){hit=t;normal=chartNormal(ray*t,pixel);return true;}
  float advance=max(0.0,abs(raw)-error)*.98;
  if(t+advance>u_far)return false;
  float next=t+advance;
  if(next<=t){hit=t;complete=false;return false;}
  t=next;
 }
 hit=t;complete=false;return false;
}
float decodeRestart(vec4 color){uvec4 b=uvec4(round(color*255.0));return uintBitsToFloat(b.x|(b.y<<8u)|(b.z<<16u)|(b.w<<24u));}
void main(){
 outTrace=encodeDistance(-1.0,false);
 float restart=0.0;
 if(u_traceResume&&u_query==0){restart=decodeRestart(texelFetch(u_traceState,ivec2(gl_FragCoord.xy),0));if(restart<0.0)discard;}
 outSurface=vec4(.5,.5,1.0,1.0);
 if(u_chartMode==0&&(u_rootCount!=1||texelFetch(u_roots,ivec2(3,0),0).w>.5)){outColor=vec4(1,0,1,1);return;}
 Root root=Root(vec3(0),mat3(1),1.0);
 if(u_chartMode==0)root=readRoot();
 vec2 ndc=2.0*gl_FragCoord.xy/u_resolution-1.0-u_origin;
 vec2 slope=u_projection.x>0.0?ndc/u_projection:(2.0*gl_FragCoord.xy-u_resolution-u_origin*u_resolution)/(min(u_resolution.x,u_resolution.y)*u_focal);
 vec3 ray=u_query==1||u_query==3||u_query==4?normalize(u_queryRay):normalize(u_forward+slope.x*u_right+slope.y*u_up);
 if(u_query==2){float distance=u_chartMode==0?max(0.0,reliefField(rootInverse(root,-root.center),0.0))*root.size:max(0.0,romanescoChartField(vec3(0),0.0));outColor=encodeDistance(distance,true);return;}
 float hit;vec3 normal;bool complete;
 bool found;
 if(u_chartMode==0)found=traceRelief(ray,root,restart,hit,normal,complete);
 else found=traceChart(ray,restart,hit,normal,complete);
 if(u_query==1){outColor=encodeDistance(hit,found);return;}
 if(u_query==3){outColor=vec4(normal*.5+.5,complete?(found?1.0:0.0):.5);return;}
 if(u_query==4){outColor=encodeDistance(float(fieldEvaluations),true);return;}
 if(u_query==5){outColor=vec4(reliefBracketUsed?1.0:0.0,complete?1.0:0.0,found?1.0:0.0,1.0);return;}
 if(!complete){outTrace=encodeDistance(hit,true);outColor=vec4(1.0,0.0,.65,1.0);return;}
 vec3 color=u_background;
 if(found){
  if(dot(normal,ray)>0.0)normal=-normal;
  vec3 viewNormal=vec3(dot(normal,u_right),dot(normal,u_up),-dot(normal,u_forward));
  vec3 oct=viewNormal/(abs(viewNormal.x)+abs(viewNormal.y)+abs(viewNormal.z));vec2 encoded=oct.xy;
  if(oct.z<0.0)encoded=(1.0-abs(encoded.yx))*mix(vec2(-1.0),vec2(1.0),step(vec2(0.0),encoded));
  float depth=clamp(log2(1.0+hit*dot(ray,u_forward))/log2(1.0+u_far),0.0,.998),coarse=floor(depth*255.0)/255.0;
  outSurface=vec4(encoded*.5+.5,coarse,(depth-coarse)*255.0);
  float diffuse=max(0.0,dot(normal,normalize(vec3(-.5,.8,.6))));
  vec3 illumination=vec3(.38+.62*diffuse+.15*max(0.0,dot(normal,-ray)));
  if(u_lighting==1&&u_faces){
   vec3 key=normalize(-.65*u_right+.85*u_up-.65*u_forward);
   vec3 ambient=mix(vec3(.27,.30,.36),vec3(.36,.36,.33),.5+.5*dot(normal,u_up));
   illumination=min(vec3(1.0),ambient+.82*max(0.0,dot(normal,key))*vec3(1.04,1.0,.94));
   float relief=max(0.0,hit*dot(ray,u_forward)-u_reliefFront)*96.0*u_fogScale;
   illumination*=.55+.45*exp(-.9*relief);
  }
  color=u_faces?u_fill*illumination:u_stroke*illumination;
  float fog=clamp((1.0-exp(-4.0*max(0.0,hit*u_fogScale-.2/96.0)))/(1.0-exp(-4.0*(1.0-.2/96.0))),0.0,1.0);
  vec3 atmosphere=u_background;if(u_lighting==1&&u_faces)atmosphere=mix(u_background,vec3(.13,.18,.23),.3*(1.0-fog));
  color=mix(color,atmosphere,fog);
 }
 outColor=vec4(color,found?1.0:0.0);
}

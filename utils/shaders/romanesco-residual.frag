// Include after the ordinary surface field. Texture rows are CPU-conditioned
// anchors; no large absolute height is subtracted on the GPU.
uniform highp sampler2D u_residualTable;
uniform ivec3 u_residualOffsets,u_residualCounts;
uniform vec3 u_residualInverseSigma;
uniform float u_residualScale, u_residualHeight, u_residualRing;
uniform float u_residualRadialRatio, u_residualPrimaryRatio, u_residualSideLogTransport;
uniform float u_residualDelta, u_residualShearCoefficient, u_residualBottomUpperWork;
uniform vec2 u_residualRootUnit, u_residualDiskPoint, u_residualAmplitudeOffsets, u_residualShearOffsets;
uniform vec3 u_residualAnchorField, u_residualDeltaOffsets, u_residualAngleTransports;
bool residualReliable=true;
float residualError=0.0;
// Runtime bounds are accumulated in working units. Rejected raw evaluations
// must be reported as incomplete by the caller, never interpreted as a zero.
bool residualFinite(float x){return !isnan(x)&&!isinf(x);}
float residualLength(vec2 p){float m=max(abs(p.x),abs(p.y));return m>0.0?m*length(p/m):0.0;}
void residualAccount(float magnitude){residualError+=4e-7*(1.0+abs(magnitude));}
bool residualRawAllowance(float error,float pixel){
 // A finite error remains useful for safe steps through empty space. Carry it
 // into the distance and hit uncertainty instead of abandoning a wide ray.
 if(!residualFinite(error)){residualReliable=false;return false;}
 residualError+=error;return true;
}
const vec2 RESIDUAL_LOG=vec2(-.7595399299,-5.5728090001),RESIDUAL_ANGLE=vec2(4.6862956114,-1.9098593171);
vec4 residualTexel(int row,int column){return texelFetch(u_residualTable,ivec2(column,row),0);}
float residualComponent(vec4 p,int i){return p[i];}
vec2 residualJump(int neighbor){
 vec2 axial=neighbor==1?vec2(1,0):neighbor==2?vec2(-1,0):neighbor==3?vec2(0,1):neighbor==4?vec2(0,-1):neighbor==5?vec2(1,1):neighbor==6?vec2(-1,-1):vec2(0);
 return vec2(axial.x-.5*axial.y,.8660254037844386*axial.y)/HEX_COVER;
}
vec2 residualPlane(int plane){
 return plane==0?vec2(1,0):plane==1?vec2(-1,0):plane==2?vec2(.5,.8660254037844386):plane==3?vec2(-.5,-.8660254037844386):plane==4?vec2(-.5,.8660254037844386):vec2(.5,-.8660254037844386);
}
float residualGap(int row,int neighbor){
 if(neighbor==0)return 0.0;
 return neighbor<4?residualTexel(row,3)[neighbor]:residualTexel(row,4)[neighbor-4];
}
float residualRimGap(int row,int neighbor,int plane){int at=neighbor*6+plane;return residualTexel(row,5+at/4)[at%4];}
float residualLogRatio(float x){
 if(abs(x)<.125)return 1.0+x*(-.5+x*(.3333333333333333+x*(-.25+x*(.2+x*(-.1666666666666667+x*.1428571428571429)))));
 return log(1.0+x)/x;
}
float residualAtanRatio(float x,float y){
 if(x>0.0&&abs(y)<.125*x){float z=y/x,z2=z*z;return (1.0+z2*(-.3333333333333333+z2*(.2+z2*(-.1428571428571429+z2*.1111111111111111))))/x;}
 if(abs(y)<1e-30){residualReliable=false;return 0.0;}
 return atan(y,x)/y;
}
vec2 residualCell(float radius,float angle,vec2 phase){
 float u=-log(max(radius,1e-30))/DECAY,v=angle/TAU;
 vec2 address=vec2(LATTICE_A*u+13.0*v,LATTICE_B*u-8.0*v)+phase;
 vec3 cube=vec3(address.x,-address.y,-address.x+address.y),rounded=floor(cube+.5),error=abs(rounded-cube);
 if(error.x>error.y&&error.x>error.z)rounded.x=-rounded.y-rounded.z;else if(error.y>error.z)rounded.y=-rounded.x-rounded.z;else rounded.z=-rounded.x-rounded.y;
 vec2 p=address-vec2(rounded.x,-rounded.y);
 return vec2(p.x-.5*p.y,.8660254037844386*p.y)/HEX_COVER;
}
float residualRawTail(vec2 p,int firstRank,int remaining,float amplitude,float pixel){
 float value=0.0,weight=1.0;
 for(int i=0;i<RELIEF_LEVELS;i++){
  if(i>=remaining||float(firstRank+i)>u_maxRank)break;
  float radius=min(1.0,residualLength(p));
  float growth=float(firstRank+i)>0.0&&float(firstRank+i)==u_maxRank?u_growth:1.0;
  value+=weight*(1.0-radius)*growth;
  weight*=PATCH_EPS*radius*hexRim(p);
  if(radius<=1e-30||weight*abs(amplitude)<=pixel*.03125||(value>0.0&&weight<value*1e-8))break;
  p=spiralCell(radius,atan(p.y,p.x));
 }
 return value;
}

vec2 residualWrap(vec2 q){
 vec2 p=q*HEX_COVER;float b=p.y/.8660254037844386;vec2 address=vec2(p.x+.5*b,b);
 vec3 cube=vec3(address.x,-address.y,-address.x+address.y),rounded=floor(cube+.5),error=abs(rounded-cube);
 if(error.x>error.y&&error.x>error.z)rounded.x=-rounded.y-rounded.z;else if(error.y>error.z)rounded.y=-rounded.x-rounded.z;else rounded.z=-rounded.x-rounded.y;
 vec2 local=address-vec2(rounded.x,-rounded.y);
 return vec2(local.x-.5*local.y,.8660254037844386*local.y)/HEX_COVER;
}
float residualRawCurrent(vec2 q,bool circle,int rank,int remaining,float amplitude,float pixel){
 if(!circle)return residualRawTail(residualWrap(q),rank,remaining+1,amplitude,pixel);
 float r=residualLength(q);if(r>=1.0)return 0.0;
 float g=rank>0&&float(rank)==u_maxRank?u_growth:1.0;
 float value=g*(1.0-r),weight=PATCH_EPS*r*clamp((1.0-r)/RIM_WIDTH,0.0,1.0);
 if(r>1e-30&&remaining>0&&weight*abs(amplitude)>pixel*.03125)
  value+=weight*residualRawTail(spiralCell(r,atan(q.y,q.x)),rank+1,remaining,weight*amplitude,pixel);
 return value;
}
float residualChangedTail(vec2 q,float radius,int rank,int remaining,float tailWork,float anchorWork,float anchorHeight,float pixel){
 if(remaining<=0||float(rank+1)>u_maxRank||tailWork==0.0)return -anchorWork*anchorHeight;
 // The coefficient vanishes on a changed-cell seam. Its error is measured
 // after conversion to working units, rather than guessed from root scale.
 float error=abs(tailWork)*1.2e-5+abs(anchorWork*anchorHeight)*1.2e-7;
 if(!residualRawAllowance(error,pixel))return 0.0;
 float next=radius>1e-30?residualRawTail(spiralCell(radius,atan(q.y,q.x)),rank+1,remaining,tailWork,pixel):0.0;
 return tailWork*next-anchorWork*anchorHeight;
}

// Return (max(0,1-rNew)-max(0,1-rAnchor))/s without cancelling unit values.
float residualBaseDelta(float radiusDelta,float gap,float baseAnchor){
 if(gap-radiusDelta>0.0)return baseAnchor>0.0?-radiusDelta:gap-radiusDelta;
 return baseAnchor>0.0?-gap:0.0;
}
// dq=(q-qAnchor)/s_i, dAmplitude=(A-AAnchor)/S0. Return Δ(AH)/S0.
float residualOrbit(int offset,int count,vec2 dq,float dAmplitude,float pixel){
 float change=0.0;
 for(int level=0;level<RELIEF_LEVELS+1;level++){
  if(level>=count)break;
  int row=offset+level;
  vec4 anchor=residualTexel(row,0),scales=residualTexel(row,1),tail=residualTexel(row,2);
  vec4 phase=residualTexel(row,16),meta=residualTexel(row,17),rimClip=residualTexel(row,18),center=residualTexel(row,19);
  float rA=anchor.z,wA=anchor.w,s=scales.z,B=scales.y+s*dAmplitude,growth=meta.y;
  int rank=int(phase.z),remaining=int(meta.z),flags=int(phase.w);bool circle=(flags&1)!=0,centerSafe=(flags&2)!=0,zeroTail=(flags&4)!=0;
  if(float(rank)>u_maxRank)break;
  // A tiny center can have a large normalized anchor. Keep its existing
  // anchored tail instead of subtracting two huge raw tail contributions.
  if(centerSafe&&dot(center.zw,center.zw)>.5&&scales.w*residualLength(dq)<.25){
   vec2 unit=center.zw;float radial=dot(unit,dq),tangent=dot(vec2(-unit.y,unit.x),dq);
   float ratio=scales.w,relativeNorm=residualLength(unit+ratio*dq);
   float dr=(2.0*radial+ratio*dot(dq,dq))/(relativeNorm+1.0);
   float baseChange=growth*(tail.w*dAmplitude-B*dr);change+=baseChange;residualAccount(baseChange);
   float dTail=rimClip.w*dAmplitude+PATCH_EPS*B*dr;
   if(level+1>=count){
    // The CPU may end its resolved anchor prefix before the logical tail.
    // Each remaining patch lies in [0,1], so retain its whole possible
    // contribution in the error bound instead of dropping it silently.
    if(remaining>0&&float(rank+1)<=u_maxRank)
     residualError+=abs(tail.y+dTail)+abs(tail.y*tail.z);
    return change;
   }
   float relative=ratio*dr;
   if(relative<=-1.0){residualReliable=false;return change;}
   float dLog=tail.x*dr*residualLogRatio(relative);
   float dAngle=tail.x*tangent*residualAtanRatio(1.0+ratio*radial,ratio*tangent);
   dq=RESIDUAL_LOG*dLog+RESIDUAL_ANGLE*dAngle;dAmplitude=dTail;
   continue;
  }
  // A center has a regular deficit even though its angle/log coordinates do
  // not. Phase(log s_i) restores the exact small-radius spiral sequence.
  if(centerSafe){
   vec2 q=center.xy+dq;float radius=residualLength(q),oldRadius=residualLength(center.xy);
   float dr=radius+oldRadius>1e-30?dot(dq,2.0*center.xy+dq)/(radius+oldRadius):0.0;
   float rawRadius=s*radius;
   if(rawRadius>=.1){residualReliable=false;return change;}
   change+=growth*(tail.w*dAmplitude-B*dr);
   float tailWork=PATCH_EPS*B*radius,next=0.0;
   if(radius>1e-30&&remaining>0&&float(rank+1)<=u_maxRank){
    float error=abs(tailWork)*1.2e-5+abs(tail.y*tail.z)*1.2e-7;
    if(!residualRawAllowance(error,pixel))return change;
    next=residualRawTail(residualCell(radius,atan(q.y,q.x),phase.xy),rank+1,remaining,tailWork,pixel);
   }
   change+=tailWork*next-tail.y*tail.z;
   return change;
  }
  // Seven neighboring centers suffice only for a small displacement. A wide
  // current patch can be evaluated raw only when its *weighted* float error is
  // below the working-pixel allowance; otherwise explicitly reject it.
  if(!circle&&residualLength(s*dq)>.25){
   vec2 qRaw=anchor.xy+s*dq;float amplitudeWork=scales.x+dAmplitude;
   float error=abs(amplitudeWork)*1.2e-5*(1.0+residualLength(qRaw))+abs(scales.x*meta.w)*1.2e-7;
   if(!residualRawAllowance(error,pixel))return change;
   change+=amplitudeWork*residualRawCurrent(qRaw,false,rank,remaining,amplitudeWork,pixel)-scales.x*meta.w;
   return change;
  }
  int neighbor=0;float selected=0.0;
  if(!circle)for(int j=1;j<7;j++){
   float score=residualGap(row,j)-2.0*dot(residualJump(j),dq);
   if(score<selected){selected=score;neighbor=j;}
  }
  vec2 qA=anchor.xy-residualJump(neighbor),qNew=qA+s*dq;
  float rNew=residualLength(qNew),denominator=rNew+rA;
  float dr;
  if(neighbor==0){
   vec2 unit=center.zw;float ratio=scales.w;
   dr=(2.0*dot(unit,dq)+ratio*dot(dq,dq))/(residualLength(unit+ratio*dq)+1.0);
  }else {
   if(!(denominator>1e-30)){residualReliable=false;return change;}
   dr=(residualGap(row,neighbor)+2.0*dot(qA,dq)+s*dot(dq,dq))/denominator;
  }
  float dBase=residualBaseDelta(dr,residualTexel(row,4).w,tail.w);
  float baseChange=growth*(tail.w*dAmplitude+B*dBase);change+=baseChange;residualAccount(baseChange);
  float rawRimDelta;
  if(circle)rawRimDelta=(rimClip.z-dr)/RIM_WIDTH;
  else {
   float inward=1e30;
   for(int plane=0;plane<6;plane++)inward=min(inward,residualRimGap(row,neighbor,plane)-HEX_COVER*dot(residualPlane(plane),dq));
   rawRimDelta=inward/RIM_WIDTH;
  }
  float dw=clamp(rawRimDelta,rimClip.x,rimClip.y);
  float dTail=rimClip.w*dAmplitude+PATCH_EPS*B*(wA*dr+rNew*dw);
  // At a cell edge the old and new nested weights vanish. Their working-unit
  // coefficients stay finite, so evaluate the changed tail directly.
  if(neighbor!=0||zeroTail||level+1>=count){
   float tailWork=tail.y+dTail;
   change+=residualChangedTail(qNew,rNew,rank,remaining,tailWork,tail.y,tail.z,pixel);
   return change;
  }
  float relative=scales.w*dr;
  vec2 unit=center.zw;
  float tangent=dot(vec2(-unit.y,unit.x),dq),radial=dot(unit,dq);
  float x=1.0+scales.w*radial,y=scales.w*tangent;
  if(relative<=-1.0){residualReliable=false;return change;}
  float dLog=tail.x*dr*residualLogRatio(relative);
  float dAngle=tail.x*tangent*residualAtanRatio(x,y);
  dq=RESIDUAL_LOG*dLog+RESIDUAL_ANGLE*dAngle;
  dAmplitude=dTail;
 }
 return change;
}

// All inputs are deltas from the HP anchor in working-frame canonical axes.
// CPU field headers contain (sideRaw, bottomRaw, y-1)/S0. No absolute field
// subtraction or division by an underflowed absolute anchor occurs here.
float residualEvaluate(vec3 point,float pixel){
 float radialRatio=u_residualRadialRatio;
 vec2 delta=point.xz,unit=u_residualRootUnit;
 if(dot(unit,unit)<.5){residualReliable=false;return 0.0;}
 float radialProjection=dot(unit,delta),crossProjection=dot(vec2(-unit.y,unit.x),delta);
 vec2 relativePoint=unit+radialRatio*delta;
 float radialNorm=residualLength(relativePoint);
 float dR=(2.0*radialProjection+radialRatio*dot(delta,delta))/(radialNorm+1.0);
 float hGap=-.5*u_residualAnchorField.z,dh=-.5*point.y;
 float dH=hGap>0.0?max(-hGap,dh):max(0.0,hGap+dh);
 float dAmplitude=min(u_residualAmplitudeOffsets.x+RELIEF_HEIGHT*dH,u_residualAmplitudeOffsets.y+RELIEF_HEIGHT/BASE_RADIUS*dR);
 float dDelta=max(u_residualDeltaOffsets.y,min(u_residualDeltaOffsets.x+dR-BASE_RADIUS*dH,u_residualDeltaOffsets.z+RELIEF_HEIGHT*dH));
 float S=u_residualScale,h=u_residualHeight,sdh=S*dH;
 float dH4=dH*(4.0*h*h*h+sdh*(6.0*h*h+sdh*(4.0*h+sdh)));
 float dC=max(u_residualShearOffsets.y,u_residualShearOffsets.x-.63*dH4);
 float dPrimary=dH+u_residualShearCoefficient*dDelta+u_residualDelta*dC+S*dC*dDelta;
 float relativeLog=u_residualPrimaryRatio*dPrimary;
 float angleX=1.0+radialRatio*radialProjection,angleY=radialRatio*crossProjection;
 if(relativeLog<=-1.0||!residualFinite(dPrimary)||!residualFinite(dR)){residualReliable=false;return 0.0;}
 float angleRatio=residualAtanRatio(angleX,angleY);
 vec3 angleDelta=u_residualAngleTransports*(crossProjection*angleRatio);
 float logDelta=u_residualSideLogTransport*dPrimary*residualLogRatio(relativeLog);
 vec2 sideQ=RESIDUAL_LOG*logDelta+RESIDUAL_ANGLE*angleDelta.x;
 float sideChange=residualOrbit(u_residualOffsets.x,u_residualCounts.x,sideQ,dAmplitude,pixel);
 float side=(u_residualAnchorField.x+dR-BASE_RADIUS*dH-sideChange)/SIDE_LIPSCHITZ;
 float top=u_residualAnchorField.z+point.y;
 residualAccount(abs(dR)+abs(BASE_RADIUS*dH)+abs(sideChange));
 // Hdisk >=0, hence this upper bound applies even to rays inside the body.
 if((u_residualBottomUpperWork-point.y)/BOTTOM_LIPSCHITZ<side){
  residualError/=SIDE_LIPSCHITZ;
  float result=max(top,side);residualAccount(result);return result;
 }
 vec2 ringQ=RESIDUAL_ANGLE*angleDelta.y;
 float ringChange=residualOrbit(u_residualOffsets.y,u_residualCounts.y,ringQ,0.0,pixel);
 float newRing=u_residualRing+S*ringChange;
 if(!(newRing>=.8)){residualReliable=false;return max(top,side);}
 vec2 diskQ=(delta-u_residualDiskPoint*ringChange)/newRing*u_residualInverseSigma.z;
 float bottomChange=residualOrbit(u_residualOffsets.z,u_residualCounts.z,diskQ,0.0,pixel);
 float bottom=(u_residualAnchorField.y-point.y-bottomChange)/BOTTOM_LIPSCHITZ;
 residualError/=min(SIDE_LIPSCHITZ,BOTTOM_LIPSCHITZ);
 float result=max(top,max(side,bottom));residualAccount(result);return result;
}
float romanescoResidualRawField(vec3 point,float pixel){
 residualReliable=true;residualError=0.0;fieldEvaluations++;
 float value=residualEvaluate(point,pixel);
 if(!residualFinite(value)||!residualFinite(residualError)){residualReliable=false;return 0.0;}
 return value;
}
float romanescoResidualField(vec3 point,float pixel){
 float value=romanescoResidualRawField(point,pixel);
 // Match the ordinary fixed-rank field's optional positive-tail allowance.
 residualError+=pixel*.032;
 return sign(value)*max(0.0,abs(value)-residualError);
}

(function(context) {
    'use strict';
    var maxObjectSize = 100 * 1000 * 1000; var maxObjectCount = 32768; var EPOCH = 978307200000;
    function UID(id) { this.UID = id; } context.UID = UID;
    function parseBuffer(arrayBuffer) {
        if (!(arrayBuffer instanceof ArrayBuffer)) { throw new Error("Input must be an ArrayBuffer."); }
        var view = new DataView(arrayBuffer); var header = '';
        if (arrayBuffer.byteLength < 8) throw new Error("File too small to be bplist.");
        for (var h = 0; h < 8; h++) { header += String.fromCharCode(view.getUint8(h)); }
        if (header !== 'bplist00') { if (header.substring(0,6) !== 'bplist'){ throw new Error("Invalid bplist. Got: " + header);}}
        var trailerStart = arrayBuffer.byteLength - 32; if (trailerStart < 8) { throw new Error("File too small for bplist trailer."); }
        var trailerView = new DataView(arrayBuffer, trailerStart);
        var offsetSize = trailerView.getUint8(6); var objectRefSize = trailerView.getUint8(7);
        function readUIntBE(dv, start, length) {
            var val = 0; if (length > 6 && length <= 8) { let hB = 0; let lB = 0; if (length === 8) { hB = dv.getUint32(start, false); lB = dv.getUint32(start + 4, false); return hB * Math.pow(2, 32) + lB; } for (var i = 0; i < length; i++) { val = (val * 256) + dv.getUint8(start + i); } return val;} else if (length > 8) { throw new Error("readUIntBE: length > 8 not supported directly as JS number.");} for (var i = 0; i < length; i++) { val = (val << 8) | dv.getUint8(start + i); } return val;
        }
        var numObjects = readUIntBE(trailerView, 8, 8); var topObject = readUIntBE(trailerView, 16, 8);
        var offsetTableOffset = readUIntBE(trailerView, 24, 8);
        if (numObjects > maxObjectCount) { throw new Error("maxObjectCount exceeded: " + numObjects); } if (offsetTableOffset >= arrayBuffer.byteLength || offsetTableOffset < 0) throw new Error("offsetTableOffset out of bounds.");
        var offsetTable = [];
        for (var i = 0; i < numObjects; i++) {
            var currentOffsetPos = offsetTableOffset + i * offsetSize; if (currentOffsetPos + offsetSize > arrayBuffer.byteLength) { throw new Error("Offset table read OOB for object " + i); } offsetTable[i] = readUIntBE(view, currentOffsetPos, offsetSize);
        }
        function parseObject(tableOffset) {
            if (tableOffset >= numObjects || tableOffset < 0) { throw new Error("Invalid tableOffset " + tableOffset); } var offset = offsetTable[tableOffset]; if (offset === undefined || offset >= arrayBuffer.byteLength) {  throw new Error("Invalid offset for tableOffset " + tableOffset + ": " + offset);  }
            var type = view.getUint8(offset); var objType = (type & 0xF0) >> 4; var objInfo = (type & 0x0F);
            function ps() { switch (objInfo) { case 0x0: return null; case 0x8: return false; case 0x9: return true; case 0xF: return null; default: throw new Error("Unhandled simple:" + objInfo);}}
            function pi() { var l = Math.pow(2, objInfo); if(offset + 1 + l > arrayBuffer.byteLength) throw new Error("Int OOB"); if(l===1)return view.getUint8(offset+1); if(l===2)return view.getUint16(offset+1,false); if(l===4)return view.getInt32(offset+1,false); if(l===8){var h=view.getInt32(offset+1,false);var lw=view.getUint32(offset+5,false);return(h*Math.pow(2,32))+lw;} if(l===16){let s='0x';for(let k=0;k<l;k++){s+=view.getUint8(offset+1+k).toString(16).padStart(2,'0');} return s;} throw new Error("Int len:"+l);}
            function pui() {var l=objInfo+1; if(offset+1+l > arrayBuffer.byteLength) throw new Error("UID OOB"); var v=0;for(let i=0;i<l;i++){v=(v*256)+view.getUint8(offset+1+i);} return new UID(v);}
            function pr() {var l=Math.pow(2,objInfo); if(offset+1+l > arrayBuffer.byteLength) throw new Error("Real OOB"); if(l===4)return view.getFloat32(offset+1,false);if(l===8)return view.getFloat64(offset+1,false);throw new Error("Real len:"+l);}
            function pd() {if(objInfo!==0x3)console.warn("Date type:"+objInfo); if(offset+1+8 > arrayBuffer.byteLength) throw new Error("Date OOB"); return new Date(EPOCH+(1000*view.getFloat64(offset+1,false)));}
            function pda(){var o=1;var l=objInfo;if(objInfo===0xF){var it=view.getUint8(offset+1);var itm=(it&0xF0)>>4;if(itm!==0x1)console.warn("Data len type:"+itm);var ii=it&0x0F;var il=Math.pow(2,ii);o=2+il;if(offset+2+il > arrayBuffer.byteLength) throw new Error("Data len int OOB"); l=readUIntBE(view,offset+2,il);} if(offset+o+l > arrayBuffer.byteLength) throw new Error("Data OOB "+offset+" "+o+" "+l+" "+arrayBuffer.byteLength); return arrayBuffer.slice(offset+o,offset+o+l);}
            function psS(u){var l=objInfo;var o=1;if(objInfo===0xF){var it=view.getUint8(offset+1);var itm=(it&0xF0)>>4;if(itm!==0x1)console.warn("Str len type:"+itm);var ii=it&0x0F;var il=Math.pow(2,ii);o=2+il;if(offset+2+il > arrayBuffer.byteLength) throw new Error("Str len int OOB"); l=readUIntBE(view,offset+2,il);} var bL=u?l*2:l;if(offset+o+bL > arrayBuffer.byteLength) throw new Error("Str OOB"); var slV=new DataView(arrayBuffer,offset+o,bL);return new TextDecoder(u?'utf-16be':'utf-8').decode(slV);}
            function pa(){var l=objInfo;var o=1;if(objInfo===0xF){var it=view.getUint8(offset+1);var itm=(it&0xF0)>>4;if(itm!==0x1)console.warn("Arr len type:"+itm);var ii=it&0x0F;var il=Math.pow(2,ii);o=2+il;if(offset+2+il > arrayBuffer.byteLength) throw new Error("Arr len int OOB"); l=readUIntBE(view,offset+2,il);} var a=[]; if(offset+o+(l*objectRefSize)>arrayBuffer.byteLength) throw new Error("Arr refs OOB"); for(var i=0;i<l;i++){var r=readUIntBE(view,offset+o+i*objectRefSize,objectRefSize);a[i]=parseObject(r);} return a;}
            function pD(){var l=objInfo;var o=1;if(objInfo===0xF){var it=view.getUint8(offset+1);var itm=(it&0xF0)>>4;if(itm!==0x1)console.warn("Dic len type:"+itm);var ii=it&0x0F;var il=Math.pow(2,ii);o=2+il;if(offset+2+il > arrayBuffer.byteLength) throw new Error("Dic len int OOB");l=readUIntBE(view,offset+2,il);} var d={}; if(offset+o+(l*2*objectRefSize)>arrayBuffer.byteLength) throw new Error("Dic refs OOB"); for(var i=0;i<l;i++){var kR=readUIntBE(view,offset+o+i*objectRefSize,objectRefSize);var vR=readUIntBE(view,offset+o+(l*objectRefSize)+i*objectRefSize,objectRefSize);var k=parseObject(kR);var v=parseObject(vR);d[k]=v;} return d;}
            switch(objType){case 0x0:return ps();case 0x1:return pi();case 0x8:return pui();case 0x2:return pr();case 0x3:return pd();case 0x4:return pda();case 0x5:return psS(false);case 0x6:return psS(true);case 0xA:return pa();case 0xD:return pD();default:throw new Error("Unknown type:0x"+objType.toString(16)+" at offset "+offset);}
        }
        return [parseObject(topObject)];
    }
    context.bplistParserManual = { parseBuffer: parseBuffer, UID: UID };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof window.bplistParserManual?.parseBuffer === 'function') { console.log("Embedded bplistParserManual loaded from js/bplistParserManual.js!"); }
else { console.error("Embedded bplistParserManual FAILED to load from js/bplistParserManual.js."); }